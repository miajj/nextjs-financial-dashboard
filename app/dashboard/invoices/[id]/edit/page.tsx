import { fetchCustomers, fetchInvoiceById } from "@/app/lib/data";
import EditInvoiceForm from "@/app/ui/invoices/edit-form";
import Breadcrumbs from "@/app/ui/invoices/breadcrumbs";
import { notFound } from "next/navigation";
import { Metadata } from 'next';
 
export const metadata: Metadata = {
  title: 'Edit Invoices',
};

export default async function Page(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const id = params.id;
    // Parallel data fetching: 
    const [invoice, customers] = await Promise.all([
        fetchInvoiceById(id),
        fetchCustomers()
    ])
    if(!invoice){ //if invoice is undefined. 
        notFound();
    }
    return (
        <main>
            <Breadcrumbs
                breadcrumbs={[
                    { label: 'Invoices', href: '/dashboard/invoices' },
                    {
                        label: 'Edit invoice',
                        href: `/dashboard/invoices/${id}/edit`,
                        active: true
                    }
                ]}
            />
            <EditInvoiceForm invoice={invoice} customers={customers} />
        </main>
    )
}