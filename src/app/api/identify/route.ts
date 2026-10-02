import { identificationInput, localIdentification } from '../../../lib/providers';
export async function POST(request:Request) {
  if(Number(request.headers.get('content-length')??0)>20000)return Response.json({error:'Request too large'},{status:413});
  try{const body=await request.text();if(body.length>20000)return Response.json({error:'Request too large'},{status:413});const parsed=identificationInput.safeParse(JSON.parse(body));if(!parsed.success)return Response.json({error:'Invalid product metadata'},{status:400});return Response.json(await localIdentification.identifyProduct(parsed.data));}catch{return Response.json({error:'Invalid request'},{status:400});}
}
