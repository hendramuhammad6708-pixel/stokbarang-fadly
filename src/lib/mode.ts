// Mode demo hanya berlaku saat development; di production selalu dimatikan agar login tidak pernah terlewati.
export const isDemo = () => process.env.DEMO_MODE === "true" && process.env.NODE_ENV !== "production";
