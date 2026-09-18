import Header from "../../components/Header";
import Footer from "../../components/Footer";
// import FloatingBackButton from "../../components/FloatingBackButton";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="flex-grow overflow-x-hidden">
        {children}
      </main>
      <Footer />
      {/* <FloatingBackButton /> */}
    </>
  );
}
