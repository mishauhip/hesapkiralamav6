"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import Link from "next/link";
import { useRouter } from "next/navigation";
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

/* ------------------------------------------------------------------ */
/* 1) Zod şeması                                                      */
/* ------------------------------------------------------------------ */
const formSchema = z.object({
  username: z.string().min(3, {
    message: "Kullanıcı adı en az 3 karakter olmalıdır.",
  }),
  password: z.string().min(6, {
    message: "Şifre en az 6 karakter olmalıdır.",
  }),
  server: z.string({
    required_error: "Lütfen bir sunucu seçiniz.",
  }),
  nickname: z.string().optional(),
  league: z.string({
    required_error: "Lütfen bir lig seçiniz.",
  }),
  flex_league: z.string({
    required_error: "Lütfen bir flex ligi seçiniz.",
  }),
  solo_lp: z.coerce
    .number()
    .min(0, { message: "Solo LP 0'dan küçük olamaz" })
    .max(100, { message: "Solo LP 100'den büyük olamaz" })
    .default(0),
  flex_lp: z.coerce
    .number()
    .min(0, { message: "Flex LP 0'dan küçük olamaz" })
    .max(100, { message: "Flex LP 100'den büyük olamaz" })
    .default(0),
  notes: z.string().optional(),
  is_vip_only: z.boolean().default(false),
});

/* ------------------------------------------------------------------ */
/* 2) Şema temelli tipler                                              */
/* ------------------------------------------------------------------ */
type FormInputs = z.input<typeof formSchema>;
type FormValues = z.infer<typeof formSchema>;

/* ------------------------------------------------------------------ */
/* 3) Sabit listeler                                                  */
/* ------------------------------------------------------------------ */
const servers = ["TR", "EUW", "EUNE", "NA", "KR", "JP", "BR", "LAN", "LAS", "OCE", "RU"];

const leagues = [
  "Iron 4","Iron 3","Iron 2","Iron 1",
  "Bronze 4","Bronze 3","Bronze 2","Bronze 1",
  "Silver 4","Silver 3","Silver 2","Silver 1",
  "Gold 4","Gold 3","Gold 2","Gold 1",
  "Platinum 4","Platinum 3","Platinum 2","Platinum 1",
  "Emerald 4","Emerald 3","Emerald 2","Emerald 1",
  "Diamond 4","Diamond 3","Diamond 2","Diamond 1",
  "Master","Grandmaster","Challenger",
];

type GameAccount = {
  id: string;
  username: string;
  password: string;
  server: string;
  nickname?: string | null;
  league: string;
  flex_league?: string | null;
  solo_lp?: number | null;
  flex_lp?: number | null;
  is_available: boolean;
  assigned_to: string | null;
  created_at: string;
  user_email?: string;
  notes?: string | null;
  is_vip_only?: boolean | null;
};

/* ------------------------------------------------------------------ */
/* 4) Silme diyaloğu bileşeni                                          */
/* ------------------------------------------------------------------ */
type DeleteAccountDialogProps = {
  account: GameAccount;
  onDelete: () => void;
  isDeleting: boolean;
};

const DeleteAccountDialog = ({
  account,
  onDelete,
  isDeleting,
}: DeleteAccountDialogProps) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        className="text-destructive hover:bg-destructive/10 rounded-full ml-2"
        type="button"
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
        <AlertDialogTitle>Hesabı Sil</AlertDialogTitle>
        <AlertDialogDescription>
          <span className="font-medium text-foreground">{account.username}</span>{" "}
          hesabını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
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

/* ------------------------------------------------------------------ */
/* 5) Ana sayfa bileşeni                                              */
/* ------------------------------------------------------------------ */
export default function AccountsPage() {
  const router = useRouter();
  const { userRole } = useAuth();

  const [accounts, setAccounts] = useState<GameAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false); // submit loading
  const [isFetching, setIsFetching] = useState(false); // list loading
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [isDeletingAccount, setIsDeleting] = useState(false);
  const [deletingAccountId, setDeletingId] = useState<string | null>(null);

  // ✅ Client component’te redirect() yok → router ile yönlendir
  useEffect(() => {
    if (userRole && userRole !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [userRole, router]);

  const form = useForm<FormInputs, any, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
      server: "TR",
      nickname: "",
      league: "Gold 4",
      flex_league: "Unranked",
      solo_lp: 0,
      flex_lp: 0,
      notes: "",
      is_vip_only: false,
    },
  });

  const fetchAccounts = async () => {
    setIsFetching(true);
    try {
      const { data, error } = await supabase
        .from("game_accounts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Hesaplar yüklenirken bir hata oluştu.");
        console.error(error);
        setAccounts([]);
        return;
      }

      const enriched = await Promise.all(
        (data || []).map(async (acc: any) => {
          if (acc.assigned_to) {
            const { data: u, error: ue } = await supabase
              .from("users")
              .select("email")
              .eq("id", acc.assigned_to)
              .single();

            if (!ue && u) return { ...acc, user_email: u.email };
          }
          return acc;
        })
      );

      setAccounts(enriched as GameAccount[]);
    } catch (e) {
      toast.error("Hesaplar yüklenirken bir hata oluştu.");
      console.error(e);
      setAccounts([]);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeleteAccount = async (accountId: string) => {
    setIsDeleting(true);
    setDeletingId(accountId);
    try {
      const res = await fetch(`/api/admin/accounts/${accountId}`, {
        method: "DELETE",
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(
          `Hesap silinirken bir hata oluştu: ${body?.error ?? "Bilinmeyen hata"}`
        );
        return;
      }

      toast.success("Hesap başarıyla silindi.");
      fetchAccounts();
    } catch (e) {
      toast.error("Bir hata oluştu.");
      console.error(e);
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      const payload = {
        ...values,
        is_available: true,
      };

      const { error } = await supabase.from("game_accounts").insert(payload);

      if (error) {
        toast.error(error.message || "Hesap oluşturulurken bir hata oluştu.");
        console.error(error);
        return;
      }

      toast.success("Hesap başarıyla oluşturuldu.");
      form.reset({
        username: "",
        password: "",
        server: "TR",
        nickname: "",
        league: "Gold 4",
        flex_league: "Unranked",
        solo_lp: 0,
        flex_lp: 0,
        notes: "",
        is_vip_only: false,
      });
      setIsDialogOpen(false);
      fetchAccounts();
    } catch (e) {
      toast.error("Bir hata oluştu.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent inline-block mb-2">
          Hesap Yönetimi
        </h1>
        <p className="text-muted-foreground">
          Sisteme yeni oyun hesapları ekleyin ve mevcut hesapları yönetin
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
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
                <path d="M12 5v14M5 12h14" />
              </svg>
              Yeni Hesap Ekle
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Hesap Ekle</DialogTitle>
              <DialogDescription>Sisteme yeni bir oyun hesabı ekleyin.</DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kullanıcı Adı</FormLabel>
                        <FormControl>
                          <Input placeholder="Kullanıcı adı" {...field} />
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
                          <Input type="text" placeholder="Şifre" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="server"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sunucu</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sunucu seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {servers.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nickname"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Oyun İçi İsim (Opsiyonel)</FormLabel>
                        <FormControl>
                          <Input placeholder="Oyun içi isim" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="league"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Solo/Duo Lig</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Lig seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {leagues.map((l) => (
                              <SelectItem key={l} value={l}>
                                {l}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="solo_lp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Solo LP</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="flex_league"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Flex Lig</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Flex lig seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Unranked">Unranked</SelectItem>
                            {leagues.map((l) => (
                              <SelectItem key={l} value={l}>
                                {l}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="flex_lp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Flex LP</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="is_vip_only"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={!!field.value}
                          onCheckedChange={(v) => field.onChange(v === true)}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Sadece VIP Üyeler</FormLabel>
                        <FormDescription>
                          Bu hesabı sadece VIP üyeler kiralayabilir.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notlar</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Hesap hakkında önemli notlar"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Hesap hakkında önemli bilgileri buraya yazabilirsiniz.
                      </FormDescription>
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

        <Button variant="secondary" onClick={fetchAccounts} disabled={isFetching} type="button">
          {isFetching ? "Yenileniyor..." : "Yenile"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tüm Hesaplar</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-medium">Kullanıcı Adı</TableHead>
                <TableHead className="font-medium">Şifre</TableHead>
                <TableHead className="font-medium">Sunucu</TableHead>
                <TableHead className="font-medium">Oyun İçi İsim</TableHead>
                <TableHead className="font-medium">Solo/Duo Lig</TableHead>
                <TableHead className="font-medium">Flex Lig</TableHead>
                <TableHead className="font-medium">Durum</TableHead>
                <TableHead className="font-medium">VIP</TableHead>
                <TableHead className="font-medium">Kiralayan</TableHead>
                <TableHead className="font-medium">Notlar</TableHead>
                <TableHead className="font-medium">Oluşturulma Tarihi</TableHead>
                <TableHead className="font-medium text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/accounts/${account.id}`}
                      className="text-primary hover:underline"
                    >
                      {account.username}
                    </Link>
                  </TableCell>
                  <TableCell>{account.password}</TableCell>
                  <TableCell>{account.server || "-"}</TableCell>
                  <TableCell>{account.nickname || "-"}</TableCell>
                  <TableCell>
                    {account.league}{" "}
                    {typeof account.solo_lp === "number" ? `${account.solo_lp} LP` : ""}
                  </TableCell>
                  <TableCell>
                    {(account.flex_league || "Unranked") + " "}
                    {typeof account.flex_lp === "number" ? `${account.flex_lp} LP` : ""}
                  </TableCell>
                  <TableCell>
                    {account.is_available ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Müsait
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Kiralandı
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {account.is_vip_only ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        VIP
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{account.user_email || "-"}</TableCell>

                  <TableCell>
                    {account.notes ? (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" type="button">
                            Görüntüle
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Hesap Notu</DialogTitle>
                          </DialogHeader>
                          <div className="p-4 bg-secondary/30 rounded-md text-foreground">
                            {account.notes}
                          </div>
                        </DialogContent>
                      </Dialog>
                    ) : (
                      "-"
                    )}
                  </TableCell>

                  <TableCell>
                    {new Date(account.created_at).toLocaleDateString("tr-TR")}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <Link href={`/dashboard/accounts/${account.id}`} passHref>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-primary hover:bg-primary/10 rounded-full"
                          type="button"
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
                      </Link>

                      <DeleteAccountDialog
                        account={account}
                        onDelete={() => handleDeleteAccount(account.id)}
                        isDeleting={isDeletingAccount && deletingAccountId === account.id}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {accounts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                    Henüz hesap bulunmamaktadır. Yeni hesap eklemek için "Yeni Hesap Ekle" düğmesini kullanın.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
