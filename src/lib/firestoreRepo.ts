import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { nanoid } from 'nanoid';
import {
  ENGINE_VERSION,
  type CountryCode,
  type GroceryItem,
  type PlanDocument,
  type PlannedMeal,
  type Recipe,
  type UserProfile,
} from '@shared/index';
import { auth, db, handleFirestoreError, OperationType } from './firebase';

function stripUndefined<T>(val: T): T {
  if (val === null || val === undefined) return val;
  if (Array.isArray(val)) {
    return val.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (typeof val === 'object' && val.constructor === Object) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefined(v);
      }
    }
    return out as T;
  }
  return val;
}

export interface PriceOverrideRecord {
  ingredientId: string;
  packPriceMinor: number;
  updatedAt: string;
}

export interface TestimonialRecord {
  id: string;
  quote: string;
  authorName: string;
  city: string;
  householdLabel: string;
  approved: boolean;
}

export interface PublicShareRecord {
  shareId: string;
  ownerUid: string;
  planName: string;
  summary: PlanDocument['summary'];
  meals: Pick<
    PlannedMeal,
    'id' | 'day' | 'mealType' | 'recipeId' | 'recipeSnapshot' | 'servings' | 'costMinor' | 'kcalPerPerson'
  >[];
  grocery: Pick<
    GroceryItem,
    'id' | 'name' | 'category' | 'trip' | 'neededQty' | 'unit' | 'packLabel' | 'packsToBuy' | 'lineTotalMinor'
  >[];
  createdAt: string;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return snap.data() as UserProfile;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function ensureUserProfile(params: {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
}): Promise<UserProfile> {
  const existing = await getUserProfile(params.uid);
  if (existing) return existing;

  const periodKey = new Date().toISOString().slice(0, 7);
  const profilePayload = {
    uid: params.uid,
    displayName: params.displayName || params.email.split('@')[0] || 'Home Cook',
    email: params.email,
    photoURL: params.photoURL ?? null,
    country: 'PH' as const,
    region: 'NCR',
    currency: 'PHP' as const,
    locale: 'en' as const,
    unitSystem: 'metric' as const,
    onboardingComplete: false,
    defaults: {
      people: 4,
      equipment: ['gas_stove', 'rice_cooker', 'refrigerator'],
      prefs: ['chicken', 'vegetables', 'fish'],
      pantry: ['salt', 'cooking-oil', 'soy-sauce', 'vinegar'],
      shoppingFrequency: 'weekly',
    },
    quota: {
      periodKey,
      plansUsed: 0,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const path = `users/${params.uid}`;
  try {
    await setDoc(doc(db, 'users', params.uid), stripUndefined(profilePayload));
    return {
      ...profilePayload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as UserProfile;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateUserProfile(
  uid: string,
  patch: Partial<
    Pick<
      UserProfile,
      | 'displayName'
      | 'photoURL'
      | 'country'
      | 'region'
      | 'currency'
      | 'locale'
      | 'unitSystem'
      | 'onboardingComplete'
      | 'defaults'
    >
  >
): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(
      doc(db, 'users', uid),
      stripUndefined({
        ...patch,
        updatedAt: serverTimestamp(),
      })
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function saveGeneratedPlan(
  uid: string,
  plan: PlanDocument,
  meals: PlannedMeal[],
  grocery: GroceryItem[]
): Promise<void> {
  const planRef = doc(db, 'users', uid, 'plans', plan.id);
  const path = `users/${uid}/plans/${plan.id}`;
  try {
    const cleanPlan = stripUndefined({
      ...plan,
      uid,
      engineVersion: plan.engineVersion || ENGINE_VERSION,
      shareId: plan.shareId ?? null,
    });
    await setDoc(planRef, cleanPlan);

    // Chunk batch writes cleanly (max 500 ops per batch)
    const ops: { ref: ReturnType<typeof doc>; data: Record<string, unknown> }[] = [];
    for (const m of meals) {
      ops.push({
        ref: doc(db, 'users', uid, 'plans', plan.id, 'meals', m.id),
        data: stripUndefined(m) as unknown as Record<string, unknown>,
      });
    }
    for (const g of grocery) {
      ops.push({
        ref: doc(db, 'users', uid, 'plans', plan.id, 'grocery', g.id),
        data: stripUndefined(g) as unknown as Record<string, unknown>,
      });
    }

    for (let i = 0; i < ops.length; i += 400) {
      const batch = writeBatch(db);
      for (const op of ops.slice(i, i + 400)) {
        batch.set(op.ref, op.data);
      }
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function listUserPlans(uid: string): Promise<PlanDocument[]> {
  const path = `users/${uid}/plans`;
  try {
    const q = query(collection(db, 'users', uid, 'plans'), where('uid', '==', uid));
    const snap = await getDocs(q);
    const docs = snap.docs.map((d) => d.data() as PlanDocument);
    return docs.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function getPlanBundle(
  uid: string,
  planId: string
): Promise<{
  plan: PlanDocument;
  meals: PlannedMeal[];
  grocery: GroceryItem[];
} | null> {
  const path = `users/${uid}/plans/${planId}`;
  try {
    const planSnap = await getDoc(doc(db, 'users', uid, 'plans', planId));
    if (!planSnap.exists()) return null;

    const [mealsSnap, grocerySnap] = await Promise.all([
      getDocs(collection(db, 'users', uid, 'plans', planId, 'meals')),
      getDocs(collection(db, 'users', uid, 'plans', planId, 'grocery')),
    ]);

    const mealOrder: Record<string, number> = {
      breakfast: 0,
      lunch: 1,
      dinner: 2,
      snack: 3,
    };

    const meals = mealsSnap.docs
      .map((d) => d.data() as PlannedMeal)
      .sort((a, b) => a.day - b.day || (mealOrder[a.mealType] ?? 9) - (mealOrder[b.mealType] ?? 9));

    const grocery = grocerySnap.docs
      .map((d) => d.data() as GroceryItem)
      .sort((a, b) => a.trip - b.trip || a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

    return {
      plan: planSnap.data() as PlanDocument,
      meals,
      grocery,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function updatePlanMeta(
  uid: string,
  planId: string,
  patch: Partial<Pick<PlanDocument, 'name' | 'isSaved' | 'shareId' | 'summary' | 'warnings'>>
): Promise<void> {
  const path = `users/${uid}/plans/${planId}`;
  try {
    await updateDoc(
      doc(db, 'users', uid, 'plans', planId),
      stripUndefined({
        ...patch,
        updatedAt: new Date().toISOString(),
      })
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function applyRecostedPlan(
  uid: string,
  plan: PlanDocument,
  meals: PlannedMeal[],
  grocery: GroceryItem[],
  previousGroceryIds: string[]
): Promise<void> {
  const path = `users/${uid}/plans/${plan.id}`;
  try {
    await updateDoc(
      doc(db, 'users', uid, 'plans', plan.id),
      stripUndefined({
        summary: plan.summary,
        warnings: plan.warnings,
        updatedAt: new Date().toISOString(),
      })
    );

    const newIds = new Set(grocery.map((g) => g.id));
    type BatchOp =
      | { kind: 'set'; ref: ReturnType<typeof doc>; data: Record<string, unknown> }
      | { kind: 'del'; ref: ReturnType<typeof doc> };
    const ops: BatchOp[] = [];

    for (const m of meals) {
      ops.push({
        kind: 'set',
        ref: doc(db, 'users', uid, 'plans', plan.id, 'meals', m.id),
        data: stripUndefined(m) as unknown as Record<string, unknown>,
      });
    }

    for (const oldId of previousGroceryIds) {
      if (!newIds.has(oldId)) {
        ops.push({
          kind: 'del',
          ref: doc(db, 'users', uid, 'plans', plan.id, 'grocery', oldId),
        });
      }
    }

    for (const g of grocery) {
      ops.push({
        kind: 'set',
        ref: doc(db, 'users', uid, 'plans', plan.id, 'grocery', g.id),
        data: stripUndefined(g) as unknown as Record<string, unknown>,
      });
    }

    for (let i = 0; i < ops.length; i += 400) {
      const batch = writeBatch(db);
      for (const op of ops.slice(i, i + 400)) {
        if (op.kind === 'del') {
          batch.delete(op.ref);
        } else {
          batch.set(op.ref, op.data);
        }
      }
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function toggleMealCooked(
  uid: string,
  planId: string,
  mealId: string,
  cooked: boolean
): Promise<void> {
  const path = `users/${uid}/plans/${planId}/meals/${mealId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'plans', planId, 'meals', mealId), {
      cooked,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function updateGroceryPurchase(
  uid: string,
  planId: string,
  itemId: string,
  patch: {
    purchased: boolean;
    purchasedAt: string | null;
    actualPaidMinor?: number | null;
  }
): Promise<void> {
  const path = `users/${uid}/plans/${planId}/grocery/${itemId}`;
  try {
    await updateDoc(
      doc(db, 'users', uid, 'plans', planId, 'grocery', itemId),
      stripUndefined(patch)
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deletePlanCascade(uid: string, planId: string): Promise<void> {
  const path = `users/${uid}/plans/${planId}`;
  try {
    const [mealsSnap, grocerySnap] = await Promise.all([
      getDocs(collection(db, 'users', uid, 'plans', planId, 'meals')),
      getDocs(collection(db, 'users', uid, 'plans', planId, 'grocery')),
    ]);

    const batch = writeBatch(db);
    mealsSnap.docs.forEach((d) => batch.delete(d.ref));
    grocerySnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, 'users', uid, 'plans', planId));
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function listPriceOverrides(
  uid: string
): Promise<Record<string, PriceOverrideRecord>> {
  const path = `users/${uid}/priceOverrides`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'priceOverrides'));
    const map: Record<string, PriceOverrideRecord> = {};
    snap.docs.forEach((d) => {
      const data = d.data() as PriceOverrideRecord;
      map[data.ingredientId] = data;
    });
    return map;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function setPriceOverride(
  uid: string,
  ingredientId: string,
  packPriceMinor: number
): Promise<void> {
  const path = `users/${uid}/priceOverrides/${ingredientId}`;
  try {
    await setDoc(doc(db, 'users', uid, 'priceOverrides', ingredientId), {
      ingredientId,
      packPriceMinor: Math.round(packPriceMinor),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deletePriceOverride(
  uid: string,
  ingredientId: string
): Promise<void> {
  const path = `users/${uid}/priceOverrides/${ingredientId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'priceOverrides', ingredientId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function createOrGetShareSnapshot(
  uid: string,
  plan: PlanDocument,
  meals: PlannedMeal[],
  grocery: GroceryItem[]
): Promise<string> {
  const shareId = plan.shareId || `shr_${nanoid(12)}`;
  const path = `shares/${shareId}`;
  try {
    const payload: PublicShareRecord = {
      shareId,
      ownerUid: uid,
      planName: plan.name,
      summary: plan.summary,
      meals: meals.map((m) => ({
        id: m.id,
        day: m.day,
        mealType: m.mealType,
        recipeId: m.recipeId,
        recipeSnapshot: m.recipeSnapshot,
        servings: m.servings,
        costMinor: m.costMinor,
        kcalPerPerson: m.kcalPerPerson,
      })),
      grocery: grocery.map((g) => ({
        id: g.id,
        name: g.name,
        category: g.category,
        trip: g.trip,
        neededQty: g.neededQty,
        unit: g.unit,
        packLabel: g.packLabel,
        packsToBuy: g.packsToBuy,
        lineTotalMinor: g.lineTotalMinor,
      })),
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'shares', shareId), stripUndefined(payload));
    if (plan.shareId !== shareId) {
      await updatePlanMeta(uid, plan.id, { shareId });
    }
    return shareId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function getPublicShare(shareId: string): Promise<PublicShareRecord | null> {
  const path = `shares/${shareId}`;
  try {
    const snap = await getDoc(doc(db, 'shares', shareId));
    if (!snap.exists()) return null;
    return snap.data() as PublicShareRecord;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function listApprovedTestimonials(): Promise<TestimonialRecord[]> {
  try {
    const q = query(
      collection(db, 'testimonials'),
      where('approved', '==', true),
      limit(6)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<TestimonialRecord, 'id'>),
    }));
  } catch {
    return [];
  }
}

export async function submitFeedbackDoc(payload: {
  name: string;
  email: string;
  topic: 'pricing' | 'recipe' | 'bug' | 'feature' | 'general';
  message: string;
}): Promise<void> {
  const id = `fb_${nanoid(12)}`;
  const path = `feedback/${id}`;
  try {
    await setDoc(doc(db, 'feedback', id), {
      ...payload,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function submitWaitlistDoc(payload: {
  email: string;
  country: CountryCode;
}): Promise<void> {
  const id = `wl_${nanoid(12)}`;
  const path = `waitlist/${id}`;
  try {
    await setDoc(doc(db, 'waitlist', id), {
      ...payload,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function listFirestoreRecipes(): Promise<Recipe[]> {
  if (!auth.currentUser?.emailVerified) return [];
  try {
    const snap = await getDocs(collection(db, 'recipes'));
    return snap.docs.map((d) => d.data() as Recipe);
  } catch {
    return [];
  }
}

export async function saveAdminRecipe(recipe: Recipe): Promise<void> {
  const path = `recipes/${recipe.id}`;
  try {
    await setDoc(doc(db, 'recipes', recipe.id), stripUndefined(recipe));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function exportUserDataJson(uid: string): Promise<Record<string, unknown>> {
  const [profile, plans, overrides] = await Promise.all([
    getUserProfile(uid),
    listUserPlans(uid),
    listPriceOverrides(uid),
  ]);

  const planBundles = await Promise.all(plans.map((p) => getPlanBundle(uid, p.id)));
  return {
    exportedAt: new Date().toISOString(),
    profile,
    priceOverrides: Object.values(overrides),
    plans: planBundles.filter(Boolean),
  };
}

export async function deleteAllUserData(uid: string): Promise<void> {
  const plans = await listUserPlans(uid);
  for (const p of plans) {
    await deletePlanCascade(uid, p.id);
  }
  const overrides = await listPriceOverrides(uid);
  for (const key of Object.keys(overrides)) {
    await deletePriceOverride(uid, key);
  }
  await deleteDoc(doc(db, 'users', uid));
}
