"use client";

// Select yang langsung mengirim form saat diganti (filter tanpa tombol "Terapkan")
export function AutoSubmitSelect({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className="input" onChange={(e) => e.currentTarget.form?.requestSubmit()}>
      {children}
    </select>
  );
}
