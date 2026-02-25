import { useEffect } from 'react';
import { RouterProvider, createRouter, createRoute, createRootRoute, redirect, Outlet } from '@tanstack/react-router';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useActor } from './hooks/useActor';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppRole, type UserProfile } from './backend';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import AdminPanel from './pages/AdminPanel';
import Layout from './components/Layout';
import ProfileSetupModal from './components/ProfileSetupModal';

// Root route with layout
const rootRoute = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <>
      <Outlet />
      <Toaster richColors position="top-right" />
    </>
  );
}

// Login route
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: Login,
});

// Protected layout route
const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'protected',
  component: ProtectedLayout,
});

function ProtectedLayout() {
  const { identity, isInitializing } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const queryClient = useQueryClient();

  const profileQuery = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching && !!identity,
    retry: false,
  });

  // Register or login when actor is ready and user is authenticated
  useEffect(() => {
    if (actor && identity && !actorFetching) {
      actor.registerOrLogin().then(() => {
        queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      }).catch(console.error);
    }
  }, [actor, identity, actorFetching, queryClient]);

  if (isInitializing || actorFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!identity) {
    return <Login />;
  }

  if (profileQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading profile...</p>
        </div>
      </div>
    );
  }

  const userProfile = profileQuery.data;
  const showProfileSetup = !!identity && profileQuery.isFetched && (userProfile === null || (userProfile && !userProfile.name && !userProfile.email));

  if (userProfile && userProfile.status === '#rejected' as unknown) {
    const status = userProfile.status as unknown as string;
    if (status === '#rejected' || (userProfile.status as unknown as { rejected: null })?.rejected !== undefined) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center max-w-md p-8">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🚫</span>
            </div>
            <h2 className="text-2xl font-display font-bold text-foreground mb-2">Access Denied</h2>
            <p className="text-muted-foreground">Your account has been rejected. Please contact an administrator.</p>
          </div>
        </div>
      );
    }
  }

  // Check status properly
  const statusStr = userProfile ? JSON.stringify(userProfile.status) : '';
  const isRejected = statusStr.includes('rejected');
  const isPending = statusStr.includes('pending');
  const isApproved = statusStr.includes('approved');
  const isAdmin = userProfile ? JSON.stringify(userProfile.role).includes('admin') : false;

  if (isRejected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🚫</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Your account has been rejected. Please contact an administrator.</p>
        </div>
      </div>
    );
  }

  if (isPending && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⏳</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-foreground mb-2">Pending Approval</h2>
          <p className="text-muted-foreground mb-4">Your account is awaiting administrator approval. You'll be notified once approved.</p>
          <p className="text-xs text-muted-foreground">Principal: {identity.getPrincipal().toString().slice(0, 20)}...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showProfileSetup && <ProfileSetupModal />}
      <Layout>
        <Outlet />
      </Layout>
    </>
  );
}

// Dashboard route
const dashboardRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/',
  component: Dashboard,
});

const dashboardRoute2 = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/dashboard',
  component: Dashboard,
});

const inventoryRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/inventory',
  component: Inventory,
});

const reportsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/reports',
  component: Reports,
});

const adminRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/admin',
  component: AdminPanel,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  protectedRoute.addChildren([
    dashboardRoute,
    dashboardRoute2,
    inventoryRoute,
    reportsRoute,
    adminRoute,
  ]),
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}
