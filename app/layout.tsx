import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Korea Brief · 全球新闻与韩国企业战略',description:'聚合八个地区的全球新闻，以 AI 评估韩国企业相关性，提供中文速读、热点追踪与有引用的战略报告。',robots:{index:true,follow:true},icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>;}
