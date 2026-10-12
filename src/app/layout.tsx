import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Ħabib · Learn a little, understand a lot',description:'Maltese mathematics tutor prototype for adult testers'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="mt"><body>{children}</body></html>;}
