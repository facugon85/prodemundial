import { useApp } from '../../context/AppContext.jsx'
import Sidebar from './Sidebar.jsx'
import BottomNav from './BottomNav.jsx'
import MobileTopbar from './MobileTopbar.jsx'
import PredecirPage from '../pages/PredecirPage.jsx'
import HistorialPage from '../pages/HistorialPage.jsx'
import PremiosPage from '../pages/PremiosPage.jsx'
import RankingPage from '../pages/RankingPage.jsx'
import AdminPage, { ValidarPage, UsuariosPage } from '../pages/AdminPage.jsx'
import ProfilePage from '../pages/ProfilePage.jsx'
import BracketPage from '../pages/BracketPage.jsx'

const PAGES = {
  predecir: PredecirPage,
  historial: HistorialPage,
  premios:  PremiosPage,
  ranking:  RankingPage,
  admin:    AdminPage,
  perfil:   ProfilePage,
  cuadro:   BracketPage,
  validar:  ValidarPage,
  usuarios: UsuariosPage,
}

export default function AppShell() {
  const { user, page, goPage } = useApp()
  const Page = PAGES[page] || PredecirPage

  return (
    <>
      <MobileTopbar />
      <div className="app">
        <Sidebar />
        <div className="main">
          <Page key={page} />
        </div>
      </div>
      <BottomNav />
    </>
  )
}
