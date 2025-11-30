'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { canAccessEditorSection } from '@/lib/admin-utils-shared';
import { AdminDiscoverTab } from '@/components/admin/discover';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import type { UserRole } from '@/types';

export default function EditorPage() {
  const router = useRouter();
  const { sessionClaims, isLoaded } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Get role from Clerk session (from JWT)
  const role = (sessionClaims?.publicMetadata as any)?.role as UserRole;
  const hasEditorAccess = canAccessEditorSection(role);

  // Check authorization
  useEffect(() => {
    if (isLoaded && mounted && !hasEditorAccess) {
      // Redirect unauthorized users
      router.push('/');
    }
  }, [hasEditorAccess, isLoaded, router, mounted]);

  // Show loading state
  if (!isLoaded || !mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#faf8f6] to-[#f5f2ed] dark:from-[#05070b] dark:to-[#11141b]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#a07855] dark:border-[#b8896a] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#5f5a55] dark:text-[#b2b6c2] font-albert">Loading...</p>
        </div>
      </div>
    );
  }

  // Show nothing if not authorized (will redirect)
  if (!hasEditorAccess) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf8f6] to-[#f5f2ed] dark:from-[#05070b] dark:to-[#11141b] p-6 lg:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-[#1a1a1a] dark:text-[#f5f5f8] mb-2 font-albert">
            Content Editor
          </h1>
          <p className="text-[#5f5a55] dark:text-[#b2b6c2] font-albert">
            Manage articles, events, and courses for the Discover section
          </p>
        </div>
        <ThemeToggle />
      </div>

      {/* Main Content - Only Discover Tab */}
      <div className="max-w-7xl mx-auto">
        <AdminDiscoverTab />
      </div>
    </div>
  );
}


