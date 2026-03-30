import Header from "../../components/Header";
import Footer from "../../components/Footer";
import FloatingBackButton from "../../components/FloatingBackButton";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="flex-grow overflow-x-hidden pb-12 md:pb-0">
        {children}
      </main>
      <Footer />
      <FloatingBackButton />
    </>
  );
}
