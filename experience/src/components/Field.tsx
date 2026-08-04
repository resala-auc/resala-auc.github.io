import { motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { TOUCH_SPRING, rise } from "../lib/motion";

const shell =
  "w-full rounded-2xl border bg-white/[0.04] px-5 py-4 text-white placeholder:text-white/35 outline-none transition-colors duration-300 backdrop-blur-sm focus:border-brand-orange focus:bg-white/[0.07]";

type BaseProps = {
  id: string;
  label: string;
  helper?: string;
  error?: string;
  children?: ReactNode;
};

function Frame({ id, label, helper, error, children }: BaseProps) {
  return (
    <motion.div variants={rise} className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium tracking-wide text-white/70">
        {label}
      </label>
      {children}
      {helper && !error ? <p className="text-xs text-white/40">{helper}</p> : null}
      {error ? (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs font-medium text-brand-orange"
          role="alert"
        >
          {error}
        </motion.p>
      ) : null}
    </motion.div>
  );
}

type TextFieldProps = BaseProps & {
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "text" | "tel" | "email" | "numeric";
};

export function TextField({
  id,
  label,
  helper,
  error,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
  inputMode
}: TextFieldProps) {
  return (
    <Frame id={id} label={label} helper={helper} error={error}>
      <motion.input
        whileFocus={{ scale: 1.012 }}
        transition={TOUCH_SPRING}
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
        className={`${shell} ${error ? "border-brand-orange/70" : "border-white/12"}`}
      />
    </Frame>
  );
}

type SelectFieldProps = BaseProps & {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
};

export function SelectField({
  id,
  label,
  helper,
  error,
  value,
  onChange,
  options,
  placeholder = "Select one"
}: SelectFieldProps) {
  return (
    <Frame id={id} label={label} helper={helper} error={error}>
      {/* `appearance-none` strips the native arrow, which left this looking like a
          text field with no hint that it opens — so the chevron is drawn back in. */}
      <div className="group relative">
        <select
          id={id}
          value={value}
          aria-invalid={Boolean(error)}
          onChange={(event) => onChange(event.target.value)}
          className={`${shell} cursor-pointer appearance-none pr-12 hover:border-white/30 hover:bg-white/[0.06] ${
            value ? "text-white" : "text-white/45"
          } ${error ? "border-brand-orange/70" : "border-white/12"}`}
        >
          <option value="" disabled className="bg-brand-ink text-white/60">
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option} value={option} className="bg-brand-ink text-white">
              {option}
            </option>
          ))}
        </select>

        <ChevronDown
          aria-hidden
          strokeWidth={1.75}
          className="pointer-events-none absolute top-1/2 right-5 h-5 w-5 -translate-y-1/2 text-white/40 transition-colors duration-300 group-hover:text-white/70"
        />
      </div>
    </Frame>
  );
}

type TextAreaFieldProps = BaseProps & {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
};

export function TextAreaField({
  id,
  label,
  helper,
  error,
  value,
  onChange,
  placeholder,
  rows = 5
}: TextAreaFieldProps) {
  return (
    <Frame id={id} label={label} helper={helper} error={error}>
      <motion.textarea
        whileFocus={{ scale: 1.008 }}
        transition={TOUCH_SPRING}
        id={id}
        value={value}
        rows={rows}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
        className={`${shell} resize-none leading-relaxed ${
          error ? "border-brand-orange/70" : "border-white/12"
        }`}
      />
    </Frame>
  );
}
