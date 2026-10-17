import './globals.css';
import './motion.css';
import { SavedItemsProvider } from '../components/saved-items-provider';
import { AuthProvider } from '../components/auth-provider';
export const metadata={title:'PERDTU — Open. Swap. Repeat.',description:'Discover better exchanges with PERDTU.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><AuthProvider><SavedItemsProvider>{children}</SavedItemsProvider></AuthProvider></body></html>}
