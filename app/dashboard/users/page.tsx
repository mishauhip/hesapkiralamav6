"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { redirect } from "next/navigation";

const formSchema = z.object({
  email: z.string().email({
    message: "Geçerli bir e-posta adresi giriniz.",
  }),
  password: z.string().min(6, {
    message: "Şifre en az 6 karakter olmalıdır.",
  }),
  role: z.enum(["ADMIN", "USER", "VIP"], {
    required_error: "Lütfen bir rol seçiniz.",
  }),
});

type User = {
  id: string;
  email: string;
  role: "ADMIN" | "USER" | "VIP";
  created_at: string;
};

type DeleteUserDialogProps = {
  user: User;
  onDelete: () => void;
  isDeleting: boolean;
};

type ChangeRoleDialogProps = {
  user: User;
  onRoleChange: (role: string) => void;
  isChangingRole: boolean;
};

const ChangeRoleDialog = ({
  user,
  onRoleChange,
  isChangingRole,
}: ChangeRoleDialogProps) => {
  const [selectedRole, setSelectedRole] = useState<"ADMIN" | "USER" | "VIP">(
    user.role
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-full"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kullanıcı Rolünü Değiştir</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{user.email}</span>{" "}
            kullanıcısının rolünü değiştirin.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Select
            value={selectedRole}
            onValueChange={(value) =>
              setSelectedRole(value as "ADMIN" | "USER" | "VIP")
            }
            disabled={isChangingRole}
          >
            <SelectTrigger>
              <SelectValue placeholder="Rol seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="USER">Kullanıcı</SelectItem>
              <SelectItem value="VIP">VIP Kullanıcı</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onRoleChange(selectedRole)}
            disabled={isChangingRole || selectedRole === user.role}
          >
            {isChangingRole ? "Güncelleniyor..." : "Güncelle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DeleteUserDialog = ({
  user,
  onDelete,
  isDeleting,
}: DeleteUserDialogProps) => {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:bg-destructive/10 rounded-full"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Kullanıcıyı Sil</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-foreground">{user.email}</span>{" "}
            kullanıcısını silmek istediğinize emin misiniz? Bu işlem geri
            alınamaz.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>İptal</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDelete}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting ? "Siliniyor..." : "Sil"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default function UsersPage() {
  const { userRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [changingRoleUserId, setChangingRoleUserId] = useState<string | null>(
    null
  );

  // Admin değilse dashboard'a yönlendir
  if (userRole !== "ADMIN") {
    redirect("/dashboard");
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      role: "USER",
    },
  });

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Kullanıcılar yüklenirken bir hata oluştu.");
      console.error(error);
      return;
    }

    setUsers(data as User[]);
  };

  const handleDeleteUser = async (userId: string) => {
    setIsDeletingUser(true);
    setDeletingUserId(userId);

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(
          `Kullanıcı silinirken bir hata oluştu: ${
            data.error || "Bilinmeyen hata"
          }`
        );
        return;
      }

      toast.success("Kullanıcı başarıyla silindi.");
      fetchUsers(); // Kullanıcı listesini yenile
    } catch (error) {
      toast.error("Bir hata oluştu.");
      console.error(error);
    } finally {
      setIsDeletingUser(false);
      setDeletingUserId(null);
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    setIsChangingRole(true);
    setChangingRoleUserId(userId);

    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(
          `Kullanıcı rolü güncellenirken bir hata oluştu: ${
            data.error || "Bilinmeyen hata"
          }`
        );
        return;
      }

      toast.success("Kullanıcı rolü başarıyla güncellendi.");
      fetchUsers(); // Kullanıcı listesini yenile
    } catch (error) {
      toast.error("Bir hata oluştu.");
      console.error(error);
    } finally {
      setIsChangingRole(false);
      setChangingRoleUserId(null);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      // API endpoint'i üzerinden kullanıcı oluştur
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          role: values.role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(
          `Kullanıcı oluşturulurken bir hata oluştu: ${
            data.error || "Bilinmeyen hata"
          }`
        );
        return;
      }

      toast.success("Kullanıcı başarıyla oluşturuldu.");
      form.reset();
      setIsDialogOpen(false);
      fetchUsers();
    } catch (error) {
      toast.error("Bir hata oluştu.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent inline-block mb-2">
          Kullanıcı Yönetimi
        </h1>
        <p className="text-muted-foreground">
          Sisteme yeni kullanıcılar ekleyin ve mevcut kullanıcıları yönetin
        </p>
      </div>

      <div className="flex justify-end items-center">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 transition-all">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 10v4" />
                <path d="M20 12h4" />
              </svg>
              Yeni Kullanıcı Ekle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Kullanıcı Ekle</DialogTitle>
              <DialogDescription>
                Sisteme yeni bir kullanıcı ekleyin. Kullanıcı bilgilerini
                doldurduktan sonra kaydet butonuna tıklayın.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-posta</FormLabel>
                      <FormControl>
                        <Input placeholder="ornek@mail.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Şifre</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="******"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rol</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Rol seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="USER">Kullanıcı</SelectItem>
                          <SelectItem value="VIP">VIP Kullanıcı</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Kaydediliyor..." : "Kaydet"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-md overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary to-accent w-full"></div>
        <CardHeader>
          <CardTitle className="text-xl font-medium">Kullanıcılar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg overflow-hidden border">
            <Table>
              <TableHeader className="bg-secondary">
                <TableRow>
                  <TableHead className="font-medium">E-posta</TableHead>
                  <TableHead className="font-medium">Rol</TableHead>
                  <TableHead className="font-medium">
                    Oluşturulma Tarihi
                  </TableHead>
                  <TableHead className="font-medium text-right">
                    İşlemler
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-secondary/50">
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === "ADMIN"
                            ? "bg-primary/10 text-primary"
                            : user.role === "VIP"
                            ? "bg-accent/10 text-accent"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {user.role === "ADMIN"
                          ? "Admin"
                          : user.role === "VIP"
                          ? "VIP Kullanıcı"
                          : "Kullanıcı"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString("tr-TR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        <ChangeRoleDialog
                          user={user}
                          onRoleChange={(newRole) =>
                            handleChangeRole(user.id, newRole)
                          }
                          isChangingRole={
                            isChangingRole && changingRoleUserId === user.id
                          }
                        />
                        <DeleteUserDialog
                          user={user}
                          onDelete={() => handleDeleteUser(user.id)}
                          isDeleting={
                            isDeletingUser && deletingUserId === user.id
                          }
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Henüz kullanıcı bulunmamaktadır.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
