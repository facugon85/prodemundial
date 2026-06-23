// ============================================================
//  Fixture oficial — FIFA World Cup 2026
//  Fase de grupos: 72 partidos (IDs 1-72)
//  Eliminatorias:  32 partidos (IDs 73-104)
// ============================================================

const GS = [
  // ── GRUPO A ─────────────────────────────────────────────────
  { id:1,  phase:'group', group:'A', round:'Grupo A · Fecha 1', date:'11 Jun', time:'14:00', t1:'México',        f1:'🇲🇽', t2:'Sudáfrica',          f2:'🇿🇦', stadium:'Estadio Ciudad de México' },
  { id:2,  phase:'group', group:'A', round:'Grupo A · Fecha 1', date:'11 Jun', time:'21:00', t1:'Corea del Sur', f1:'🇰🇷', t2:'R. Checa',            f2:'🇨🇿', stadium:'Estadio Guadalajara' },
  { id:3,  phase:'group', group:'A', round:'Grupo A · Fecha 2', date:'18 Jun', time:'11:00', t1:'R. Checa',      f1:'🇨🇿', t2:'Sudáfrica',          f2:'🇿🇦', stadium:'Atlanta Stadium' },
  { id:4,  phase:'group', group:'A', round:'Grupo A · Fecha 2', date:'18 Jun', time:'20:00', t1:'México',        f1:'🇲🇽', t2:'Corea del Sur',      f2:'🇰🇷', stadium:'Estadio Guadalajara' },
  { id:5,  phase:'group', group:'A', round:'Grupo A · Fecha 3', date:'24 Jun', time:'20:00', t1:'R. Checa',      f1:'🇨🇿', t2:'México',             f2:'🇲🇽', stadium:'Estadio Ciudad de México' },
  { id:6,  phase:'group', group:'A', round:'Grupo A · Fecha 3', date:'24 Jun', time:'20:00', t1:'Sudáfrica',     f1:'🇿🇦', t2:'Corea del Sur',      f2:'🇰🇷', stadium:'Estadio Monterrey' },

  // ── GRUPO B ─────────────────────────────────────────────────
  { id:7,  phase:'group', group:'B', round:'Grupo B · Fecha 1', date:'12 Jun', time:'14:00', t1:'Canadá',             f1:'🇨🇦', t2:'Bosnia y Herzegovina', f2:'🇧🇦', stadium:'Toronto Stadium' },
  { id:8,  phase:'group', group:'B', round:'Grupo B · Fecha 1', date:'13 Jun', time:'14:00', t1:'Qatar',              f1:'🇶🇦', t2:'Suiza',                f2:'🇨🇭', stadium:'San Francisco Bay Area Stadium' },
  { id:9,  phase:'group', group:'B', round:'Grupo B · Fecha 2', date:'18 Jun', time:'14:00', t1:'Suiza',              f1:'🇨🇭', t2:'Bosnia y Herzegovina', f2:'🇧🇦', stadium:'Los Angeles Stadium' },
  { id:10, phase:'group', group:'B', round:'Grupo B · Fecha 2', date:'18 Jun', time:'17:00', t1:'Canadá',             f1:'🇨🇦', t2:'Qatar',                f2:'🇶🇦', stadium:'BC Place Vancouver' },
  { id:11, phase:'group', group:'B', round:'Grupo B · Fecha 3', date:'24 Jun', time:'14:00', t1:'Suiza',              f1:'🇨🇭', t2:'Canadá',               f2:'🇨🇦', stadium:'BC Place Vancouver' },
  { id:12, phase:'group', group:'B', round:'Grupo B · Fecha 3', date:'24 Jun', time:'14:00', t1:'Bosnia y Herzegovina',f1:'🇧🇦', t2:'Qatar',               f2:'🇶🇦', stadium:'Seattle Stadium' },

  // ── GRUPO C ─────────────────────────────────────────────────
  { id:13, phase:'group', group:'C', round:'Grupo C · Fecha 1', date:'13 Jun', time:'17:00', t1:'Brasil',   f1:'🇧🇷', t2:'Marruecos', f2:'🇲🇦', stadium:'Boston Stadium' },
  { id:14, phase:'group', group:'C', round:'Grupo C · Fecha 1', date:'13 Jun', time:'20:00', t1:'Haití',    f1:'🇭🇹', t2:'Escocia',   f2:'🏴󠁧󠁢󠁳󠁣󠁴󠁿', stadium:'New York / New Jersey Stadium' },
  { id:15, phase:'group', group:'C', round:'Grupo C · Fecha 2', date:'19 Jun', time:'21:30', t1:'Brasil',   f1:'🇧🇷', t2:'Haití',     f2:'🇭🇹', stadium:'Philadelphia Stadium' },
  { id:16, phase:'group', group:'C', round:'Grupo C · Fecha 2', date:'19 Jun', time:'19:00', t1:'Escocia',  f1:'🏴󠁧󠁢󠁳󠁣󠁴󠁿', t2:'Marruecos', f2:'🇲🇦', stadium:'Boston Stadium' },
  { id:17, phase:'group', group:'C', round:'Grupo C · Fecha 3', date:'24 Jun', time:'17:00', t1:'Escocia',  f1:'🏴󠁧󠁢󠁳󠁣󠁴󠁿', t2:'Brasil',    f2:'🇧🇷', stadium:'Miami Stadium' },
  { id:18, phase:'group', group:'C', round:'Grupo C · Fecha 3', date:'24 Jun', time:'17:00', t1:'Marruecos',f1:'🇲🇦', t2:'Haití',     f2:'🇭🇹', stadium:'Atlanta Stadium' },

  // ── GRUPO D ─────────────────────────────────────────────────
  { id:19, phase:'group', group:'D', round:'Grupo D · Fecha 1', date:'12 Jun', time:'20:00', t1:'Estados Unidos', f1:'🇺🇸', t2:'Paraguay',  f2:'🇵🇾', stadium:'Los Angeles Stadium' },
  { id:20, phase:'group', group:'D', round:'Grupo D · Fecha 1', date:'13 Jun', time:'23:00', t1:'Australia',      f1:'🇦🇺', t2:'Turquía',   f2:'🇹🇷', stadium:'BC Place Vancouver' },
  { id:21, phase:'group', group:'D', round:'Grupo D · Fecha 2', date:'20 Jun', time:'00:00', t1:'Turquía',        f1:'🇹🇷', t2:'Paraguay',  f2:'🇵🇾', stadium:'San Francisco Bay Area Stadium' },
  { id:22, phase:'group', group:'D', round:'Grupo D · Fecha 2', date:'18 Jun', time:'23:00', t1:'Estados Unidos', f1:'🇺🇸', t2:'Australia', f2:'🇦🇺', stadium:'Seattle Stadium' },
  { id:23, phase:'group', group:'D', round:'Grupo D · Fecha 3', date:'25 Jun', time:'21:00', t1:'Turquía',        f1:'🇹🇷', t2:'Estados Unidos', f2:'🇺🇸', stadium:'Los Angeles Stadium' },
  { id:24, phase:'group', group:'D', round:'Grupo D · Fecha 3', date:'25 Jun', time:'21:00', t1:'Paraguay',       f1:'🇵🇾', t2:'Australia', f2:'🇦🇺', stadium:'San Francisco Bay Area Stadium' },

  // ── GRUPO E ─────────────────────────────────────────────────
  { id:25, phase:'group', group:'E', round:'Grupo E · Fecha 1', date:'14 Jun', time:'12:00', t1:'Alemania',       f1:'🇩🇪', t2:'Curazao',         f2:'🇨🇼', stadium:'Philadelphia Stadium' },
  { id:26, phase:'group', group:'E', round:'Grupo E · Fecha 1', date:'14 Jun', time:'18:00', t1:'Costa de Marfil',f1:'🇨🇮', t2:'Ecuador',         f2:'🇪🇨', stadium:'Houston Stadium' },
  { id:27, phase:'group', group:'E', round:'Grupo E · Fecha 2', date:'20 Jun', time:'15:00', t1:'Alemania',       f1:'🇩🇪', t2:'Costa de Marfil', f2:'🇨🇮', stadium:'Toronto Stadium' },
  { id:28, phase:'group', group:'E', round:'Grupo E · Fecha 2', date:'20 Jun', time:'19:00', t1:'Curazao',        f1:'🇨🇼', t2:'Ecuador',         f2:'🇪🇨', stadium:'Kansas City Stadium' },
  { id:29, phase:'group', group:'E', round:'Grupo E · Fecha 3', date:'25 Jun', time:'15:00', t1:'Ecuador',        f1:'🇪🇨', t2:'Alemania',        f2:'🇩🇪', stadium:'Philadelphia Stadium' },
  { id:30, phase:'group', group:'E', round:'Grupo E · Fecha 3', date:'25 Jun', time:'15:00', t1:'Curazao',        f1:'🇨🇼', t2:'Costa de Marfil', f2:'🇨🇮', stadium:'New York / New Jersey Stadium' },

  // ── GRUPO F ─────────────────────────────────────────────────
  { id:31, phase:'group', group:'F', round:'Grupo F · Fecha 1', date:'14 Jun', time:'15:00', t1:'Países Bajos', f1:'🇳🇱', t2:'Japón',   f2:'🇯🇵', stadium:'Dallas Stadium' },
  { id:32, phase:'group', group:'F', round:'Grupo F · Fecha 1', date:'14 Jun', time:'21:00', t1:'Suecia',       f1:'🇸🇪', t2:'Túnez',   f2:'🇹🇳', stadium:'Estadio Monterrey' },
  { id:33, phase:'group', group:'F', round:'Grupo F · Fecha 2', date:'20 Jun', time:'12:00', t1:'Países Bajos', f1:'🇳🇱', t2:'Suecia',  f2:'🇸🇪', stadium:'Houston Stadium' },
  { id:34, phase:'group', group:'F', round:'Grupo F · Fecha 2', date:'21 Jun', time:'01:00', t1:'Japón',        f1:'🇯🇵', t2:'Túnez',   f2:'🇹🇳', stadium:'Estadio Monterrey' },
  { id:35, phase:'group', group:'F', round:'Grupo F · Fecha 3', date:'25 Jun', time:'18:00', t1:'Túnez',        f1:'🇹🇳', t2:'Países Bajos', f2:'🇳🇱', stadium:'Dallas Stadium' },
  { id:36, phase:'group', group:'F', round:'Grupo F · Fecha 3', date:'25 Jun', time:'18:00', t1:'Japón',        f1:'🇯🇵', t2:'Suecia',  f2:'🇸🇪', stadium:'Kansas City Stadium' },

  // ── GRUPO G ─────────────────────────────────────────────────
  { id:37, phase:'group', group:'G', round:'Grupo G · Fecha 1', date:'15 Jun', time:'14:00', t1:'Bélgica',      f1:'🇧🇪', t2:'Egipto',        f2:'🇪🇬', stadium:'Los Angeles Stadium' },
  { id:38, phase:'group', group:'G', round:'Grupo G · Fecha 1', date:'15 Jun', time:'20:00', t1:'Irán',         f1:'🇮🇷', t2:'Nueva Zelanda', f2:'🇳🇿', stadium:'Seattle Stadium' },
  { id:39, phase:'group', group:'G', round:'Grupo G · Fecha 2', date:'21 Jun', time:'14:00', t1:'Bélgica',      f1:'🇧🇪', t2:'Irán',          f2:'🇮🇷', stadium:'Los Angeles Stadium' },
  { id:40, phase:'group', group:'G', round:'Grupo G · Fecha 2', date:'21 Jun', time:'20:00', t1:'Egipto',       f1:'🇪🇬', t2:'Nueva Zelanda', f2:'🇳🇿', stadium:'BC Place Vancouver' },
  { id:41, phase:'group', group:'G', round:'Grupo G · Fecha 3', date:'25 Jun', time:'22:00', t1:'Nueva Zelanda',f1:'🇳🇿', t2:'Bélgica',       f2:'🇧🇪', stadium:'Seattle Stadium' },
  { id:42, phase:'group', group:'G', round:'Grupo G · Fecha 3', date:'25 Jun', time:'22:00', t1:'Egipto',       f1:'🇪🇬', t2:'Irán',          f2:'🇮🇷', stadium:'BC Place Vancouver' },

  // ── GRUPO H ─────────────────────────────────────────────────
  { id:43, phase:'group', group:'H', round:'Grupo H · Fecha 1', date:'15 Jun', time:'11:00', t1:'España',        f1:'🇪🇸', t2:'Cabo Verde',     f2:'🇨🇻', stadium:'Miami Stadium' },
  { id:44, phase:'group', group:'H', round:'Grupo H · Fecha 1', date:'15 Jun', time:'17:00', t1:'Arabia Saudita',f1:'🇸🇦', t2:'Uruguay',        f2:'🇺🇾', stadium:'Atlanta Stadium' },
  { id:45, phase:'group', group:'H', round:'Grupo H · Fecha 2', date:'21 Jun', time:'11:00', t1:'España',        f1:'🇪🇸', t2:'Arabia Saudita', f2:'🇸🇦', stadium:'Miami Stadium' },
  { id:46, phase:'group', group:'H', round:'Grupo H · Fecha 2', date:'21 Jun', time:'17:00', t1:'Cabo Verde',    f1:'🇨🇻', t2:'Uruguay',        f2:'🇺🇾', stadium:'Atlanta Stadium' },
  { id:47, phase:'group', group:'H', round:'Grupo H · Fecha 3', date:'26 Jun', time:'19:00', t1:'Uruguay',       f1:'🇺🇾', t2:'España',         f2:'🇪🇸', stadium:'Houston Stadium' },
  { id:48, phase:'group', group:'H', round:'Grupo H · Fecha 3', date:'26 Jun', time:'19:00', t1:'Cabo Verde',    f1:'🇨🇻', t2:'Arabia Saudita', f2:'🇸🇦', stadium:'Estadio Guadalajara' },

  // ── GRUPO I ─────────────────────────────────────────────────
  { id:49, phase:'group', group:'I', round:'Grupo I · Fecha 1', date:'16 Jun', time:'14:00', t1:'Francia',  f1:'🇫🇷', t2:'Senegal', f2:'🇸🇳', stadium:'New York / New Jersey Stadium' },
  { id:50, phase:'group', group:'I', round:'Grupo I · Fecha 1', date:'16 Jun', time:'17:00', t1:'Irak',     f1:'🇮🇶', t2:'Noruega', f2:'🇳🇴', stadium:'Boston Stadium' },
  { id:51, phase:'group', group:'I', round:'Grupo I · Fecha 2', date:'22 Jun', time:'16:00', t1:'Francia',  f1:'🇫🇷', t2:'Irak',    f2:'🇮🇶', stadium:'New York / New Jersey Stadium' },
  { id:52, phase:'group', group:'I', round:'Grupo I · Fecha 2', date:'22 Jun', time:'19:00', t1:'Noruega',  f1:'🇳🇴', t2:'Senegal', f2:'🇸🇳', stadium:'Philadelphia Stadium' },
  { id:53, phase:'group', group:'I', round:'Grupo I · Fecha 3', date:'26 Jun', time:'14:00', t1:'Noruega',  f1:'🇳🇴', t2:'Francia', f2:'🇫🇷', stadium:'Boston Stadium' },
  { id:54, phase:'group', group:'I', round:'Grupo I · Fecha 3', date:'26 Jun', time:'14:00', t1:'Senegal',  f1:'🇸🇳', t2:'Irak',    f2:'🇮🇶', stadium:'Toronto Stadium' },

  // ── GRUPO J ─────────────────────────────────────────────────
  { id:55, phase:'group', group:'J', round:'Grupo J · Fecha 1', date:'16 Jun', time:'20:00', t1:'Argentina', f1:'🇦🇷', t2:'Argelia',  f2:'🇩🇿', stadium:'Kansas City Stadium' },
  { id:56, phase:'group', group:'J', round:'Grupo J · Fecha 1', date:'15 Jun', time:'23:00', t1:'Austria',   f1:'🇦🇹', t2:'Jordania', f2:'🇯🇴', stadium:'San Francisco Bay Area Stadium' },
  { id:57, phase:'group', group:'J', round:'Grupo J · Fecha 2', date:'22 Jun', time:'12:00', t1:'Argentina', f1:'🇦🇷', t2:'Austria',  f2:'🇦🇹', stadium:'Dallas Stadium' },
  { id:58, phase:'group', group:'J', round:'Grupo J · Fecha 2', date:'21 Jun', time:'22:00', t1:'Jordania',  f1:'🇯🇴', t2:'Argelia',  f2:'🇩🇿', stadium:'San Francisco Bay Area Stadium' },
  { id:59, phase:'group', group:'J', round:'Grupo J · Fecha 3', date:'27 Jun', time:'21:00', t1:'Jordania',  f1:'🇯🇴', t2:'Argentina',f2:'🇦🇷', stadium:'Dallas Stadium' },
  { id:60, phase:'group', group:'J', round:'Grupo J · Fecha 3', date:'27 Jun', time:'21:00', t1:'Argelia',   f1:'🇩🇿', t2:'Austria',  f2:'🇦🇹', stadium:'Kansas City Stadium' },

  // ── GRUPO K ─────────────────────────────────────────────────
  { id:61, phase:'group', group:'K', round:'Grupo K · Fecha 1', date:'17 Jun', time:'12:00', t1:'Portugal',   f1:'🇵🇹', t2:'RD Congo',  f2:'🇨🇩', stadium:'Houston Stadium' },
  { id:62, phase:'group', group:'K', round:'Grupo K · Fecha 1', date:'17 Jun', time:'21:00', t1:'Uzbekistán', f1:'🇺🇿', t2:'Colombia',  f2:'🇨🇴', stadium:'Estadio Ciudad de México' },
  { id:63, phase:'group', group:'K', round:'Grupo K · Fecha 2', date:'23 Jun', time:'12:00', t1:'Portugal',   f1:'🇵🇹', t2:'Uzbekistán',f2:'🇺🇿', stadium:'Houston Stadium' },
  { id:64, phase:'group', group:'K', round:'Grupo K · Fecha 2', date:'23 Jun', time:'21:00', t1:'RD Congo',   f1:'🇨🇩', t2:'Colombia',  f2:'🇨🇴', stadium:'Estadio Guadalajara' },
  { id:65, phase:'group', group:'K', round:'Grupo K · Fecha 3', date:'27 Jun', time:'18:30', t1:'Colombia',   f1:'🇨🇴', t2:'Portugal',  f2:'🇵🇹', stadium:'Miami Stadium' },
  { id:66, phase:'group', group:'K', round:'Grupo K · Fecha 3', date:'27 Jun', time:'18:30', t1:'RD Congo',   f1:'🇨🇩', t2:'Uzbekistán',f2:'🇺🇿', stadium:'Atlanta Stadium' },

  // ── GRUPO L ─────────────────────────────────────────────────
  { id:67, phase:'group', group:'L', round:'Grupo L · Fecha 1', date:'17 Jun', time:'15:00', t1:'Inglaterra', f1:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', t2:'Croacia',  f2:'🇭🇷', stadium:'Toronto Stadium' },
  { id:68, phase:'group', group:'L', round:'Grupo L · Fecha 1', date:'17 Jun', time:'18:00', t1:'Ghana',      f1:'🇬🇭', t2:'Panamá',   f2:'🇵🇦', stadium:'Dallas Stadium' },
  { id:69, phase:'group', group:'L', round:'Grupo L · Fecha 2', date:'23 Jun', time:'15:00', t1:'Inglaterra', f1:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', t2:'Ghana',    f2:'🇬🇭', stadium:'Boston Stadium' },
  { id:70, phase:'group', group:'L', round:'Grupo L · Fecha 2', date:'23 Jun', time:'18:00', t1:'Croacia',    f1:'🇭🇷', t2:'Panamá',   f2:'🇵🇦', stadium:'Toronto Stadium' },
  { id:71, phase:'group', group:'L', round:'Grupo L · Fecha 3', date:'27 Jun', time:'16:00', t1:'Panamá',     f1:'🇵🇦', t2:'Inglaterra',f2:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', stadium:'New York / New Jersey Stadium' },
  { id:72, phase:'group', group:'L', round:'Grupo L · Fecha 3', date:'27 Jun', time:'16:00', t1:'Croacia',    f1:'🇭🇷', t2:'Ghana',    f2:'🇬🇭', stadium:'Philadelphia Stadium' },
].map(m => ({ ...m, status:'open', result:null }))

// ── Eliminatorias ─────────────────────────────────────────────
const TBD = { t1:'Por definir', f1:'🏳️', t2:'Por definir', f2:'🏳️' }

const KO = [
  // Octavos (IDs 73-88)
  { id:73,  phase:'r32',   round:'Octavos de final',  date:'04 Jul', time:'16:00' },
  { id:74,  phase:'r32',   round:'Octavos de final',  date:'04 Jul', time:'20:00' },
  { id:75,  phase:'r32',   round:'Octavos de final',  date:'05 Jul', time:'14:00' },
  { id:76,  phase:'r32',   round:'Octavos de final',  date:'05 Jul', time:'18:00' },
  { id:77,  phase:'r32',   round:'Octavos de final',  date:'05 Jul', time:'21:00' },
  { id:78,  phase:'r32',   round:'Octavos de final',  date:'06 Jul', time:'16:00' },
  { id:79,  phase:'r32',   round:'Octavos de final',  date:'06 Jul', time:'20:00' },
  { id:80,  phase:'r32',   round:'Octavos de final',  date:'06 Jul', time:'20:00' },
  { id:81,  phase:'r32',   round:'Octavos de final',  date:'07 Jul', time:'16:00' },
  { id:82,  phase:'r32',   round:'Octavos de final',  date:'07 Jul', time:'20:00' },
  { id:83,  phase:'r32',   round:'Octavos de final',  date:'08 Jul', time:'16:00' },
  { id:84,  phase:'r32',   round:'Octavos de final',  date:'08 Jul', time:'20:00' },
  { id:85,  phase:'r32',   round:'Octavos de final',  date:'08 Jul', time:'20:00' },
  { id:86,  phase:'r32',   round:'Octavos de final',  date:'09 Jul', time:'16:00' },
  { id:87,  phase:'r32',   round:'Octavos de final',  date:'09 Jul', time:'20:00' },
  { id:88,  phase:'r32',   round:'Octavos de final',  date:'09 Jul', time:'20:00' },
  // Ronda de 16 (IDs 89-96)
  { id:89,  phase:'r16',   round:'Ronda de 16',        date:'11 Jul', time:'16:00' },
  { id:90,  phase:'r16',   round:'Ronda de 16',        date:'11 Jul', time:'20:00' },
  { id:91,  phase:'r16',   round:'Ronda de 16',        date:'12 Jul', time:'16:00' },
  { id:92,  phase:'r16',   round:'Ronda de 16',        date:'12 Jul', time:'20:00' },
  { id:93,  phase:'r16',   round:'Ronda de 16',        date:'13 Jul', time:'16:00' },
  { id:94,  phase:'r16',   round:'Ronda de 16',        date:'13 Jul', time:'20:00' },
  { id:95,  phase:'r16',   round:'Ronda de 16',        date:'14 Jul', time:'16:00' },
  { id:96,  phase:'r16',   round:'Ronda de 16',        date:'14 Jul', time:'20:00' },
  // Cuartos (IDs 97-100)
  { id:97,  phase:'qf',    round:'Cuartos de final',   date:'17 Jul', time:'16:00' },
  { id:98,  phase:'qf',    round:'Cuartos de final',   date:'17 Jul', time:'20:00' },
  { id:99,  phase:'qf',    round:'Cuartos de final',   date:'18 Jul', time:'16:00' },
  { id:100, phase:'qf',    round:'Cuartos de final',   date:'18 Jul', time:'20:00' },
  // Semis (IDs 101-102)
  { id:101, phase:'sf',    round:'Semifinal',           date:'22 Jul', time:'20:00' },
  { id:102, phase:'sf',    round:'Semifinal',           date:'23 Jul', time:'20:00' },
  // 3er puesto (ID 103)
  { id:103, phase:'3rd',   round:'Tercer puesto',       date:'25 Jul', time:'18:00' },
  // Final (ID 104)
  { id:104, phase:'final', round:'FINAL',               date:'26 Jul', time:'20:00' },
].map(m => ({ ...m, ...TBD, status:'locked', result:null }))

export const FIXTURE = [...GS, ...KO]

export const PHASE_LABELS = {
  group: 'Fase de Grupos',
  r32:   'Octavos de Final',
  r16:   'Ronda de 16',
  qf:    'Cuartos de Final',
  sf:    'Semifinales',
  '3rd': 'Tercer Puesto',
  final: 'Final',
}
