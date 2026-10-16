import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AdminWelcome from "@/components/admin/AdminWelcome";
import RevenueOverview from "@/components/admin/RevenueOverview";
import AdminMenu from "@/components/admin/AdminMenu";
import SecurityNotice from "@/components/admin/SecurityNotice";

export default function AdminDashboard() {
    return (
        <>
            <Header />

            <main className="min-h-screen bg-[#F7F5F0] px-4 py-8 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl">
                    <AdminWelcome />
                    <RevenueOverview />
                    <AdminMenu />
                    <SecurityNotice />
                </div>
            </main>

            <Footer />
        </>
    );
}