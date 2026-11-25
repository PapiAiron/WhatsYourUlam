import * as RadixAccordion from '@radix-ui/react-accordion';
import { CaretDown } from '@phosphor-icons/react';
import styles from './Accordion.module.css';

export interface AccordionItemData {
  value: string;
  question: string;
  answer: string;
}

interface AccordionProps {
  items: AccordionItemData[];
}

export function Accordion({ items }: AccordionProps) {
  return (
    <RadixAccordion.Root type="single" collapsible className={styles.root}>
      {items.map((item) => (
        <RadixAccordion.Item key={item.value} value={item.value} className={styles.item}>
          <RadixAccordion.Header className={styles.header}>
            <RadixAccordion.Trigger className={styles.trigger}>
              <span>{item.question}</span>
              <CaretDown size={18} className={styles.caret} aria-hidden="true" />
            </RadixAccordion.Trigger>
          </RadixAccordion.Header>
          <RadixAccordion.Content className={styles.content}>
            <div className={styles.answer}>{item.answer}</div>
          </RadixAccordion.Content>
        </RadixAccordion.Item>
      ))}
    </RadixAccordion.Root>
  );
}
