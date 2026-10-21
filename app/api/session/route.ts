import {identity,response,errorResponse} from '@/lib/research/cloud';
export const dynamic='force-dynamic';
export async function GET(){try{const s=await identity();return response({isAdmin:s.isAdmin,signedIn:!!s.user});}catch(e){return errorResponse(e);}}
