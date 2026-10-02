export const MAX_IMAGE_SIZE=8*1024*1024;
export async function validateImage(file:File) {
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Use a JPEG, PNG or WebP image.');
  if(file.size===0||file.size>MAX_IMAGE_SIZE)throw new Error('Each image must be non-empty and at most 8 MB.');
  const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer());
  const valid=file.type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:file.type==='image/png'?bytes.slice(0,8).join(',')==='137,80,78,71,13,10,26,10':String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
  if(!valid)throw new Error('The image content does not match its declared type.');
  let bitmap:ImageBitmap;
  try{bitmap=await createImageBitmap(file);}catch{throw new Error('This image is corrupted or cannot be decoded.');}
  const {width,height}=bitmap;bitmap.close();
  if(width>12000||height>12000||width*height>40_000_000)throw new Error('Image dimensions exceed 12,000 pixels or 40 megapixels.');
  return {name:file.name,type:file.type as 'image/jpeg'|'image/png'|'image/webp',size:file.size,width,height,view:'front' as const};
}
