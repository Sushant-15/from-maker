import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminShell from '@/components/admin/AdminShell';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  // Check admin role
  const { data: role } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!role || role.role !== 'admin') {
    redirect('/admin/login');
  }

  return <AdminShell>{children}</AdminShell>;
}
