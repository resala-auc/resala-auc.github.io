import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Mail } from "lucide-react";
import { rise } from "../lib/motion";
import { fetchCommitteeContacts } from "../lib/api";
import type { Committee, CommitteeContact } from "../data/committees";

/**
 * Applicants take questions to the people who will actually interview them —
 * their committee's Director and Vice-Director — rather than a shared inbox.
 * The real roster is fetched live from the Board Hierarchy sheet; the static
 * fallback only shows if that lookup fails.
 */
export function ContactBlock({ committee, className = "" }: { committee: Committee; className?: string }) {
  const [contacts, setContacts] = useState<CommitteeContact[]>(committee.contacts);

  useEffect(() => {
    let cancelled = false;
    setContacts(committee.contacts);
    fetchCommitteeContacts(committee.name)
      .then((live) => {
        if (cancelled || !live.length) return;
        setContacts(
          live.map((person) => ({
            name: person.name,
            email: person.email,
            title: person.positionType
          }))
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [committee]);

  return (
    <motion.div
      variants={rise}
      className={`rounded-2xl border border-white/12 bg-white/[0.03] p-5 ${className}`}
    >
      <p className="mb-3 flex items-center gap-2 text-[11px] font-medium tracking-[0.22em] text-brand-orange uppercase">
        <Mail className="h-4 w-4" strokeWidth={1.8} />
        Questions about {committee.displayName}?
      </p>
      <ul className="flex flex-col gap-2">
        {contacts.map((contact) => (
          <li key={contact.email} className="text-sm">
            <a
              href={`mailto:${contact.email}`}
              className="inline-flex min-h-9 items-center font-medium text-white underline-offset-4 transition-colors hover:text-brand-orange hover:underline"
            >
              {contact.name}
            </a>
            {contact.title ? <span className="ml-2 text-white/45">{contact.title}</span> : null}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
