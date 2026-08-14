import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  Coffee,
  Globe2,
  MapPin,
  MenuSquare,
  MonitorSmartphone,
  QrCode,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Store,
  UtensilsCrossed,
  UsersRound,
} from 'lucide-react';
import styles from './landing.module.css';

export const metadata: Metadata = {
  title: 'QR Menu | Ethiopia-first menus, QR tables, and ordering',
  description: 'Create bilingual Ethiopian menus, share QR codes, and run table ordering from one reliable workspace.',
};

const menuItems = [
  { name: 'Shiro Wot', amharic: 'ሽሮ ወጥ', price: '280', tag: 'Fasting' },
  { name: 'Doro Wot', amharic: 'ዶሮ ወጥ', price: '520', tag: 'Popular' },
  { name: 'Yetsom Beyaynetu', amharic: 'የጾም በያይነቱ', price: '420', tag: 'Vegan' },
];

const modes = [
  {
    icon: MenuSquare,
    title: 'Menu-only QR',
    copy: 'Perfect for a fast digital menu, social sharing, or WhatsApp ordering.',
    detail: 'Guests browse. Your team receives enquiries your way.',
  },
  {
    icon: QrCode,
    title: 'One shared QR',
    copy: 'Use one branded code at your door, counter, showcase, or on Google Maps.',
    detail: 'Guests choose takeaway or dine-in when your service allows it.',
  },
  {
    icon: UtensilsCrossed,
    title: 'Table QR ordering',
    copy: 'Give every table its own secure QR and know exactly where each order belongs.',
    detail: 'Built for table service and a cleaner kitchen handoff.',
  },
];

const checks = [
  'English and Amharic, side by side',
  'Fasting, vegan, spice, portions, and combos',
  'Real-time prices and availability',
  'One branch or many locations',
];

export default function HomePage() {
  return (
    <main className={styles.page}>
      <div className={styles.topGlow} />
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="QR Menu home">
          <span className={styles.brandMark}><Store size={18} /></span>
          <span>QR Menu</span>
        </Link>
        <nav className={styles.nav} aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#modes">QR modes</a>
          <a href="#built-for-ethiopia">Built for Ethiopia</a>
        </nav>
        <Link href="/admin/login" className={styles.loginLink}>Sign in <ArrowRight size={15} /></Link>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><Sparkles size={15} /> Ethiopia-first restaurant technology</p>
          <h1>Your menu, QR tables, and orders — <em>in one place.</em></h1>
          <p className={styles.heroLead}>
            Launch a bilingual menu your guests can open instantly. Keep dishes, prices, table QR codes, and kitchen-ready orders in one dependable workspace.
          </p>
          <div className={styles.heroActions}>
            <Link href="/admin/login" className={styles.primaryButton}>Start your restaurant setup <ArrowRight size={18} /></Link>
            <a href="#product-preview" className={styles.secondaryButton}>See a live menu <ChevronRight size={18} /></a>
          </div>
          <div className={styles.reassurance}>
            <span><Check size={15} /> No guest app</span>
            <span><Check size={15} /> Amharic + English</span>
            <span><Check size={15} /> Live edits</span>
          </div>
        </div>

        <div className={styles.heroVisual} id="product-preview" aria-label="Example guest menu on a phone">
          <div className={styles.orbitOne} />
          <div className={styles.orbitTwo} />
          <div className={styles.phone}>
            <div className={styles.phoneTop}>
              <span className={styles.phoneBrand}>Mesob Kitchen</span>
              <span className={styles.languagePill}>EN <b>አማ</b></span>
            </div>
            <div className={styles.phoneHero}>
              <p>Welcome to</p>
              <strong>Mesob Kitchen</strong>
              <span>Bole, Addis Ababa</span>
            </div>
            <div className={styles.menuTabs}><b>Menu</b><span>Fasting</span><span>Drinks</span></div>
            <div className={styles.menuList}>
              {menuItems.map((item) => (
                <article key={item.name} className={styles.menuItem}>
                  <span className={styles.foodMark}>{item.name === 'Doro Wot' ? '◉' : item.name === 'Shiro Wot' ? '◒' : '✦'}</span>
                  <div><strong>{item.name}</strong><span className={styles.amharic}>{item.amharic}</span><small>{item.tag}</small></div>
                  <b>{item.price}<small> ETB</small></b>
                </article>
              ))}
            </div>
            <div className={styles.phoneOrder}><span>Table 08 · Dine in</span><button>Add to order <ArrowRight size={14} /></button></div>
          </div>
          <div className={styles.qrCard}>
            <div className={styles.miniQr}><QrCode size={34} /></div>
            <div><b>Table 08</b><span>Scan · browse · order</span></div>
          </div>
        </div>
      </section>

      <section className={styles.proofStrip} aria-label="Product benefits">
        <div><Clock3 size={20} /><span><b>Instant access</b>Menus open in the browser</span></div>
        <div><Globe2 size={20} /><span><b>Made bilingual</b>English and Amharic content</span></div>
        <div><ShieldCheck size={20} /><span><b>Control live changes</b>Prices and availability update safely</span></div>
        <div><MapPin size={20} /><span><b>Beyond the table</b>Shareable menu and QR link</span></div>
      </section>

      <section className={styles.section} id="modes">
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>Choose the guest flow</p>
          <h2>One product. The right QR setup for your restaurant.</h2>
          <p>Do not force every restaurant into table ordering. Start with the guest journey you actually need, then evolve without rebuilding the menu.</p>
        </div>
        <div className={styles.modeGrid}>
          {modes.map(({ icon: Icon, title, copy, detail }, index) => (
            <article className={`${styles.modeCard} ${index === 2 ? styles.modeFeatured : ''}`} key={title}>
              {index === 2 && <span className={styles.cardKicker}>For table service</span>}
              <span className={styles.modeIcon}><Icon size={23} /></span>
              <h3>{title}</h3>
              <p>{copy}</p>
              <small>{detail}</small>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.ethiopiaSection}`} id="built-for-ethiopia">
        <div className={styles.dishBoard}>
          <div className={styles.dishTop}><span>Menu built for local habits</span><Coffee size={19} /></div>
          <div className={styles.dishChips}><span>Fasting</span><span>Tibs</span><span>Wot</span><span>Kitfo</span><span>Beyaynetu</span></div>
          <div className={styles.dishRows}>
            <div><span className={styles.dishDot} /> <b>Portions and combinations</b><small>Half / full, platters, add-ons</small></div>
            <div><span className={styles.dishDot} /> <b>Dish-specific choices</b><small>Spice, cooking preference, sides</small></div>
            <div><span className={styles.dishDot} /> <b>Always current</b><small>Sold out today? Hide it in one click.</small></div>
          </div>
        </div>
        <div className={styles.ethiopiaCopy}>
          <p className={styles.eyebrow}>Not a translated foreign menu</p>
          <h2>Designed around how Ethiopian restaurants actually serve food.</h2>
          <p>Fasting seasons, platter choices, coffee, traditional dishes, cafés, and international items can all live in one menu without making guests hunt for what they need.</p>
          <ul>{checks.map(item => <li key={item}><Check size={18} />{item}</li>)}</ul>
        </div>
      </section>

      <section className={styles.section} id="how-it-works">
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>From menu to service</p>
          <h2>A clearer path from the first scan to the kitchen.</h2>
        </div>
        <div className={styles.flowGrid}>
          <article><span>01</span><Store size={22} /><h3>Set up your branch</h3><p>Add the restaurant details your guests need: address, map, phone, Wi-Fi, language, and service style.</p></article>
          <article><span>02</span><ReceiptText size={22} /><h3>Build a menu that fits</h3><p>Start from an Ethiopian restaurant template, then update dishes, translations, prices, and availability.</p></article>
          <article><span>03</span><QrCode size={22} /><h3>Share or print your QR</h3><p>Use one share link, a counter QR, or table-specific codes with branded printable materials.</p></article>
          <article><span>04</span><MonitorSmartphone size={22} /><h3>Run service with confidence</h3><p>Guests browse or order. Your team receives the right context, while your menu remains easy to update.</p></article>
        </div>
      </section>

      <section className={styles.operationsSection}>
        <div className={styles.operationsCopy}>
          <p className={styles.eyebrow}>More than a digital menu</p>
          <h2>Your QR code can be a storefront, a table tool, and an operations layer.</h2>
          <p>Give guests a polished menu outside the restaurant, while giving your team secure table context and order detail during service.</p>
          <Link href="/admin/login" className={styles.textLink}>Open the restaurant workspace <ArrowRight size={17} /></Link>
        </div>
        <div className={styles.operationsVisual}>
          <div className={styles.operationNode}><Globe2 size={19} /><b>Share link</b><span>Social · Maps · WhatsApp</span></div>
          <div className={styles.operationNode}><QrCode size={19} /><b>Table QR</b><span>Secure table context</span></div>
          <div className={`${styles.operationNode} ${styles.operationCenter}`}><UtensilsCrossed size={22} /><b>Your live menu</b><span>One source of truth</span></div>
          <div className={styles.operationNode}><UsersRound size={19} /><b>Guest order</b><span>Selections stay clear</span></div>
          <div className={styles.operationNode}><ReceiptText size={19} /><b>Kitchen flow</b><span>Ready for service</span></div>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div>
          <p className={styles.eyebrow}>Ready when your restaurant is</p>
          <h2>Build a menu guests understand and a service flow your team can trust.</h2>
          <p>Start with your branch, choose the QR experience, and keep every guest-facing detail current.</p>
        </div>
        <Link href="/admin/login" className={styles.primaryButton}>Start your restaurant setup <ArrowRight size={18} /></Link>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}><span className={styles.brandMark}><Store size={17} /></span><b>QR Menu</b><p>Ethiopia-first menus, QR tables, and restaurant ordering.</p></div>
        <div><b>Product</b><a href="#modes">QR modes</a><a href="#built-for-ethiopia">Ethiopian menus</a><a href="#how-it-works">How it works</a></div>
        <div><b>Restaurant</b><Link href="/admin/login">Restaurant sign in</Link><a href="#product-preview">Guest menu preview</a><a href="#modes">Choose your setup</a></div>
      </footer>
    </main>
  );
}
