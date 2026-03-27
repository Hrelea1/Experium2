import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Shield, UserPlus, Trash2, Mail } from 'lucide-react';
import { api } from '@/lib/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface UserData {
  id: string;
  email: string;
  role: string;
  is_verified: boolean;
  created_at: string;
  full_name: string | null;
}

const ManageRoles = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'moderator' | 'provider' | 'user'>('moderator');
  const [granting, setGranting] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const { toast } = useToast();

  const isPrimaryAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isPrimaryAdmin) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [isPrimaryAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.admin.getUsers({ limit: 500 }); // Fetch generous amount
      setUsers(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast({
        title: 'Eroare',
        description: 'Nu am putut încărca utilizatorii',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const changeRole = async (userId: string, role: string, isRevoke = false) => {
    if (!isPrimaryAdmin) {
      toast({
        title: 'Acces Interzis',
        description: 'Doar administratorii pot gestiona rolurile',
        variant: 'destructive',
      });
      return;
    }

    setGranting(true);
    try {
      await api.admin.setUserRole(userId, role);
      toast({
        title: 'Succes!',
        description: isRevoke ? 'Rolul a fost revocat' : `Rolul a fost setat la ${role}`,
      });
      setSelectedUserId('');
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Eroare',
        description: error.message || 'Nu am putut modifica rolul',
        variant: 'destructive',
      });
    } finally {
      setGranting(false);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!isPrimaryAdmin) {
      toast({
        title: 'Acces Interzis',
        description: 'Doar administratorii pot șterge conturi',
        variant: 'destructive',
      });
      return;
    }

    setDeletingUserId(userId);
    try {
      await api.admin.deleteUser(userId);
      toast({
        title: 'Succes',
        description: 'Contul a fost șters definitiv',
      });
      fetchData();
    } catch (error: any) {
      // Check if it's the primary admin block
      toast({
        title: 'Eroare',
        description: error.message || 'Nu am putut șterge utilizatorul',
        variant: 'destructive',
      });
    } finally {
      setDeletingUserId(null);
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, any> = {
      admin: { variant: 'default', label: 'Admin' },
      moderator: { variant: 'secondary', label: 'Moderator' },
      provider: { variant: 'outline', label: 'Furnizor', className: 'border-blue-500 text-blue-500' },
      user: { variant: 'outline', label: 'User' },
    };
    const config = variants[role] || variants.user;
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  if (!isPrimaryAdmin) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Doar administratorii pot gestiona rolurile
              </p>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  const usersWithRoles = users.filter(u => u.role !== 'user');
  const normalUsers = users.filter(u => u.role === 'user');

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Gestionare Roluri</h2>
          <p className="text-muted-foreground">
            Acordă și gestionează rolurile utilizatorilor. Platforma a fost migrată la controlul nativ al rolurilor.
          </p>
        </div>

        {/* All Users List */}
        <Card>
          <CardHeader>
            <CardTitle>Toți Utilizatorii ({users.length})</CardTitle>
            <CardDescription>
              Selectează un utilizator pentru a-i modifica rolul
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nume</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol Curent</TableHead>
                    <TableHead>Înregistrat</TableHead>
                    <TableHead className="text-right">Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const isCurrentUser = user.id === u.id;
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          {u.full_name || 'N/A'} {isCurrentUser && <Badge variant="secondary" className="ml-2">Tu</Badge>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {u.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getRoleBadge(u.role)}
                        </TableCell>
                        <TableCell>
                          {new Date(u.created_at).toLocaleDateString('ro-RO')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                              <Select 
                                value={selectedUserId === u.id ? newUserRole : ''} 
                                onValueChange={(v: 'admin' | 'moderator' | 'provider' | 'user') => {
                                  setSelectedUserId(u.id);
                                  setNewUserRole(v);
                                }}
                                disabled={isCurrentUser}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue placeholder="Modifică" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin" disabled={u.role === 'admin'}>Admin</SelectItem>
                                  <SelectItem value="moderator" disabled={u.role === 'moderator'}>Moderator</SelectItem>
                                  <SelectItem value="provider" disabled={u.role === 'provider'}>Furnizor</SelectItem>
                                  <SelectItem value="user" disabled={u.role === 'user'}>User (Revocă)</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  if (selectedUserId === u.id) {
                                    changeRole(u.id, newUserRole, newUserRole === 'user');
                                  } else {
                                    toast({
                                      title: 'Selectează un rol',
                                      description: 'Alege mai întâi rolul din dropdown',
                                    });
                                  }
                                }}
                              disabled={granting || selectedUserId !== u.id || isCurrentUser}
                            >
                              {newUserRole === 'user' ? <Trash2 className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="destructive" 
                                  size="sm" 
                                  title="Șterge utilizator"
                                  disabled={deletingUserId === u.id || isCurrentUser}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Ești complet sigur?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Această acțiune va șterge definitiv contul <strong>{u.email}</strong>, inclusiv profilul, rolurile și datele asociate. Acțiunea este ireversibilă.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Anulează</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => deleteUser(u.id)}
                                  >
                                    Șterge Ireversibil
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default ManageRoles;
