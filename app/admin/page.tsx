import {identity} from '@/lib/research/cloud';
import {chatGPTSignInPath} from '../chatgpt-auth';
import AdminConsole from './ui';
export const dynamic='force-dynamic';
export const metadata={title:'管理后台 · Korea Brief',robots:{index:false,follow:false}};
export default async function AdminPage(){const s=await identity();if(!s.user)return <main className="gate"><a className="wordmark" href="/">Korea Brief<span>·</span></a><h1>管理后台</h1><p>使用站点所有者账号登录。读者无需登录即可浏览已发布内容。</p><a className="button primary" target="_top" href={chatGPTSignInPath('/admin')}>使用 ChatGPT 登录</a><a href="/">返回网站</a></main>;if(!s.isAdmin)return <main className="gate"><h1>此账号没有管理权限</h1><p>只有已授权管理员能访问配置、草稿和私人作品集。</p><a className="button" href="/">返回公众网站</a></main>;return <AdminConsole/>;}
