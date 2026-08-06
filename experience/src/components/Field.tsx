import { motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { TOUCH_SPRING, rise } from "../lib/motion";

const shell =
  "w-full rounded-2xl border bg-white px-5 py-4 text-brand-ink placeholder:text-brand-muted/70 outline-none transition-colors duration-300 backdrop-blur-sm focus:border-brand-blue focus:bg-white";

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
      <label htmlFor={id} className="text-sm font-medium tracking-wide text-brand-muted">
        {label}
      </label>
      {children}
      {helper && !error ? <p className="text-xs text-brand-muted">{helper}</p> : null}
      {error ? (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs font-semibold text-brand-error"
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
        className={`${shell} ${error ? "border-brand-error" : "border-brand-line"}`}
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
          className={`${shell} cursor-pointer appearance-none pr-12 hover:border-brand-blue/45 hover:bg-brand-pale ${
            value ? "text-brand-ink" : "text-brand-muted"
          } ${error ? "border-brand-error" : "border-brand-line"}`}
        >
          <option value="" disabled className="bg-white text-brand-muted">
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option} value={option} className="bg-white text-brand-ink">
              {option}
            </option>
          ))}
        </select>

        <ChevronDown
          aria-hidden
          strokeWidth={1.75}
          className="pointer-events-none absolute top-1/2 right-5 h-5 w-5 -translate-y-1/2 text-brand-muted transition-colors duration-300 group-hover:text-brand-blue"
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
          error ? "border-brand-error" : "border-brand-line"
        }`}
      />
    </Frame>
  );
}
