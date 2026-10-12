import {test,expect} from '@playwright/test';
for(const width of [390,1280])test(`five-turn local lesson at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/');
 await expect(page.getByText('Local test mode · voice disabled')).toBeVisible();
 await page.getByRole('button',{name:'Let’s begin'}).click();
 for(const value of ['Ma fhimtx','4','6','ħamsa','15']){
 await page.getByRole('textbox').fill(value);await page.getByRole('button',{name:'Send answer'}).click();
 await expect(page.locator('.bubble.you')).toHaveCount(['Ma fhimtx','4','6','ħamsa','15'].indexOf(value)+1);
 }
 await expect(page.getByText('Lesson complete — well done for practising!',{exact:false})).toBeVisible();
 await expect(page.locator('.bubble.tutor')).toHaveCount(6);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'End & clear session'}).click();
 await expect(page.getByRole('button',{name:'Let’s begin'})).toBeVisible();await expect(page.locator('.bubble')).toHaveCount(0);
});
test('rejects cross-origin writes and invalid lesson state',async({request})=>{
 expect((await request.post('/api/v1/turn',{headers:{origin:'https://example.com'},data:{text:'5',step:0,mistakes:0}})).status()).toBe(503);
 expect((await request.post('/api/v1/turn',{headers:{origin:'http://localhost:3000'},data:{text:'5',step:99,mistakes:0}})).status()).toBe(400);
});
