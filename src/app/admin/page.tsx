
// This file is intentionally left blank as the admin panel functionality
// has been removed due to the removal of database dependency for credits.
// If you re-introduce a database and centralized credit management,
// you can rebuild the admin panel here.

export default function AdminPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-background text-foreground">
      <h1 className="text-3xl font-bold text-primary mb-4">Admin Panel</h1>
      <p className="text-muted-foreground">
        Admin panel functionality is currently inactive.
      </p>
      <p className="text-muted-foreground mt-2">
        User management features will be enabled here once a database and authentication are integrated.
      </p>
    </div>
  );
}
    