'use server';

import { z } from 'zod';
import postgres from 'postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

const FormSchema = z.object({
    id: z.string({
        invalid_type_error: 'Please select a customer. ',
    }),
    customerId: z.string(),
    amount: z.coerce.number().gt(0, {
        message:
            'Please enter an amount greater than $0. '
    }), //change from string to number while also validating its type. 
    status: z.enum(['pending', 'paid'], {
        invalid_type_error: 'Please select an invoice status.',
    }),
    date: z.string()
})

const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ id: true, date: true })

export type State = {
    errors?: {
        custormerId?: string[];
        amount?: string[];
        status?: string[];
    };
    message?: string | null;
}
export async function createInvoice(prevState: State, formData: FormData): Promise<State>  {

    const validatedFields = CreateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    })

    if(!validatedFields.success){
        return {
            errors:validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Create Invoice.',
        }
    }

    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0]; //YYYY-MM-DD

    try {
        await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `
    } catch (error) {
        return {
            message: 'Database Error: Failed to Create Invoice. ',
        }
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');

}

export async function updateInvoice(id: string, prevState: State, formData: FormData): Promise<State>  {
    const validatedFields = UpdateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    })

    if(!validatedFields.success){
        return {
            errors:validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Edit Invoice.',
        }
    }
    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;

    const date = new Date().toISOString().split('T')[0]; //YYYY-MM-DD
    try {
        await sql`
        UPDATE invoices
        SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}, date = ${date}
        WHERE id = ${id}
    `;
    } catch (error) {
        return {
            message: 'Database Error: Failed to Edit Invoice. ',
        }
    }


    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
    try {
        await sql`
        DELETE FROM invoices WHERE id = ${id}
    `;
    } catch (error) {
        console.error(error);
    }

    revalidatePath('/dashboard/invoices');
}

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
  ) {
    try {
      await signIn('credentials', formData);
    } catch (error) {
      if (error instanceof AuthError) {
        switch (error.type) {
          case 'CredentialsSignin':
            return 'Invalid credentials.';
          default:
            return 'Something went wrong.';
        }
      }
      throw error;
    }
  }