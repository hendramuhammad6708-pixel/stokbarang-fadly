import { ViewTransition } from "react";

// Template (bukan layout) dipasang ulang tiap berpindah halaman, jadi isi halaman memudar halus
// sementara header dan menu bawah tetap diam.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="halaman-masuk" exit="halaman-keluar" default="none">
      {children}
    </ViewTransition>
  );
}
