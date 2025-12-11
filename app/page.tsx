import { redirect } from "next/navigation";

export default function Home() {
  // Ana sayfaya gelen kullanıcıları login sayfasına yönlendir
  redirect("/login");
}
