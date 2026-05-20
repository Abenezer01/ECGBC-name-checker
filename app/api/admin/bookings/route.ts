import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

// Get pending bookings
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
       console.error("Supabase bookings fetch error:", error.message);
       return NextResponse.json({ error: error.message, bookings: [] }, { status: 500 });
    }

    return NextResponse.json({ bookings: data });
  } catch (error: any) {
    console.error("Supabase admin bookings GET error:", error);
    return NextResponse.json({ error: error.message || 'Unknown error', bookings: [] }, { status: 500 });
  }
}

// Update booking status (id, status)
export async function PUT(req: NextRequest) {
  try {
    const { id, status } = await req.json();

    if (!id || !['approved', 'rejected', 'pending'].includes(status)) {
       return NextResponse.json({ error: 'Valid ID and status required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Update booking status
    const { data: booking, error: updateError } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
       console.error("Supabase booking update error:", updateError.message);
       return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // If approved, move to organizations table
    if (status === 'approved' && booking) {
        const { error: insertError } = await supabase
          .from('organizations')
          .insert([{
             certificate_no: `REG-${Math.floor(Math.random() * 100000)}`,
             church_name: booking.church_name_am || booking.church_name_en,
             type: booking.category,
             city: 'Pending Update',
             created_at: new Date().toISOString()
          }]);
          
        if (insertError) {
           console.error("Failed to insert into organizations:", insertError);
           return NextResponse.json({ error: 'Approved, but failed to add to registry.' }, { status: 500 });
        }
    }

    return NextResponse.json({ success: true, booking });
  } catch (error: any) {
    console.error("Supabase admin bookings PUT error:", error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}
