import CashRegister from "./CashRegister";

export default function CashierOnlyAdmin() {
    return (
        <div className="bg-[#060606] min-h-screen py-8 px-4 md:px-8 text-white">
            <div className="max-w-4xl mx-auto">
                <CashRegister />
            </div>
        </div>
    );
}
