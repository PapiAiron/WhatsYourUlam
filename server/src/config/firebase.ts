import fs from 'fs';
import path from 'path';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function loadFirebaseProjectId(): string | undefined {
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const raw = JSON.parse(fs.readFileSync(configPath, 'utf8')) as {
        projectId?: string;
      };
      if (raw.projectId && raw.projectId !== 'remixed-project-id') {
        return raw.projectId;
      }
    }
  } catch {
    // Fallback to env
  }
  return process.env.VITE_FIREBASE_PROJECT_ID || undefined;
}

const projectId = loadFirebaseProjectId();

const adminApp = getApps().length
  ? getApp()
  : initializeApp(projectId ? { projectId } : {});

export const adminAuth = getAuth(adminApp);
export const firebaseProjectId = projectId;
