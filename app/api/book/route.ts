import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function POST(req: NextRequest) {
  try {
    const { nameAm, nameEn, applicantName, phoneNumber, category } = await req.json();

    if (!nameAm && !nameEn) {
      return NextResponse.json({ error: 'Either Amharic or English name is required' }, { status: 400, headers: corsHeaders });
    }

    if (!category || !['church', 'ministry'].includes(category)) {
       return NextResponse.json({ error: 'Valid category (church or ministry) is required' }, { status: 400, headers: corsHeaders });
    }

    if (!applicantName || !phoneNumber) {
        return NextResponse.json({ error: 'Applicant name and phone number are required' }, { status: 400, headers: corsHeaders });
    }

    try {
      const supabase = getServiceSupabase();
      
      // First, check if highly similar name already exists (optional but recommended)
      // ... 

      // Insert as a new booking/registration request
      const { data, error } = await supabase
        .from('bookings')
        .insert([
          { 
             church_name_am: nameAm || null, 
             church_name_en: nameEn || null, 
             applicant_name: applicantName,
             phone_number: phoneNumber,
             category: category,
             status: 'pending' 
          }
        ])
        .select()
        .single();

      if (error) {
         console.error("Supabase booking insert error:", error);
         return NextResponse.json({ 
           success: false, 
           error: error.message,
           details: "This is usually caused by Supabase RLS policies. Please ensure you have applied the schema in supabase_schema.sql" 
         }, { status: 500, headers: corsHeaders });
      }

      return NextResponse.json({
         success: true,
         message: 'Name booking submitted successfully',
         bookingId: data.id,
         data: data
      }, { headers: corsHeaders });

    } catch (e: any) {
      console.error("Booking submission error:", e);
      return NextResponse.json({ error: e.message || 'Failed to submit booking' }, { status: 500, headers: corsHeaders });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}
