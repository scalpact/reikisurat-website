// Site content. Prices live in content/prices.json, offers in content/offers.json,
// the Bengaluru seminar in content/event.json and booking slots in content/booking.json.
// Edit, then run `npm run build`.

const SITE = {
  url: 'https://reikisurat.in',
  name: 'Shree Sai Yog & Reiki Healing Centre',
  short: 'Shree Sai Reiki',
  legal: 'Shree Sai Yog & Reiki Healing Centre Private Limited',
  since: 2014,
  email: 'shreesaireikihealingcentre@gmail.com',
  shipping: 0, // rupees added to each shop order; 0 shows "Free"
  social: {
    facebook: 'https://www.facebook.com/profile.php?id=100063697185284',
    youtube: 'https://www.youtube.com/@chiraggajjarreikigrandmast8374'
  }
};

// Everything that changes between the two centres
const CITIES = {
  surat: {
    key: 'surat', label: 'Surat', full: 'Surat, Gujarat', prefix: '', badge: 'Since 2014',
    phone: '+91 97265 81787', phoneRaw: '+919726581787', wa: '919726581787',
    instagram: 'https://www.instagram.com/reikisurat/', igHandle: '@reikisurat',
    addressLines: ['4th Floor, Keshav Arcade, Golden Park Society', 'Anand Mahal Road, Opp. Kalupur Bank, Near Prime Arcade', 'Adajan, Surat, Gujarat 395009'],
    street: '4th Floor, Keshav Arcade, Golden Park Society, Anand Mahal Road, Opp. Kalupur Bank, Near Prime Arcade, Adajan',
    locality: 'Surat', region: 'Gujarat', pin: '395009', area: 'Adajan',
    map: 'https://maps.app.goo.gl/FaadyRvvvjf1QQHE6',
    mapEmbed: 'https://www.google.com/maps?q=Keshav+Arcade,+Anand+Mahal+Road,+Adajan,+Surat+395009&output=embed',
    hours: [['Monday – Saturday', '10:00 AM – 6:00 PM'], ['Sunday', 'Closed (online sessions by appointment)']],
    google: {
      rating: 4.9, count: 267,
      reviews: 'https://search.google.com/local/reviews?placeid=ChIJ4bi-YitP4DsRNxyivwdX4sY',
      write: 'https://search.google.com/local/writereview?placeid=ChIJ4bi-YitP4DsRNxyivwdX4sY'
    },
    team: ['chirag-gajjar', 'binal-gajjar', 'ajay-sonavaria', 'rohit-singh'],
    courseMode: 'At our Adajan centre', seo: 'Surat'
  },
  bangalore: {
    key: 'bangalore', label: 'Bengaluru', full: 'Bengaluru, Karnataka', prefix: '/bangalore', badge: 'New branch',
    phone: '+91 79751 31189', phoneRaw: '+917975131189', wa: '917975131189',
    instagram: 'https://www.instagram.com/shree.sai.reiki.bengaluru/', igHandle: '@shree.sai.reiki.bengaluru',
    // No public address yet (sessions run from a private location). Add the centre address here once it opens.
    addressLines: [],
    street: '', locality: 'Bengaluru', region: 'Karnataka', pin: '', area: 'Bengaluru',
    map: '', mapEmbed: '',
    hours: [['In-person sessions', 'By appointment (location shared on WhatsApp)'], ['Online sessions', 'Every day, 8:00 AM – 9:00 PM']],
    google: null, // add { rating, count, reviews, write } once the Bengaluru Google profile is live
    team: ['varun-patel', 'chirag-gajjar', 'binal-gajjar'],
    courseMode: 'In Bengaluru or online', seo: 'Bangalore'
  }
};

const INTENTS = {
  wealth:     { label: 'Money & wealth',       icon: 'solar:wallet-money-bold-duotone' },
  protection: { label: 'Protection',            icon: 'solar:shield-check-bold-duotone' },
  anxiety:    { label: 'Stress & anxiety',      icon: 'solar:meditation-round-bold-duotone' },
  love:       { label: 'Love & relationships',  icon: 'solar:heart-bold-duotone' },
  confidence: { label: 'Confidence',            icon: 'solar:star-shine-bold-duotone' },
  luck:       { label: 'Good luck',             icon: 'ph:clover-fill' },
  clarity:    { label: 'Focus & clarity',       icon: 'solar:lightbulb-bolt-bold-duotone' },
  balance:    { label: 'Chakra balance',        icon: 'solar:stars-bold-duotone' }
};
const CATS = { bracelet: 'Bracelets', tool: 'Healing tools', home: 'Home & Vastu' };
const BESTSELLERS = [
  'natural-money-magnet-crystal-wealth-bracelet', 'natural-7-chakra-crystal-bracelet', 'natural-citrine-crystal-bracelet',
  'natural-black-tourmaline-crystal-bracelet', 'natural-rose-quartz-crystal-bracelet', 'natural-triple-protection-crystal-bracelet',
  'reiki-charged-amethyst-cluster', 'natural-green-aventurine-crystal-bracelet'
];

// Healing services. Prices come from content/prices.json (same id).
const SERVICES = [
  { id: 'reiki-healing', name: 'Reiki Healing Session', mins: 60, img: '3d/svc-reiki', modes: ['offline', 'online'],
    text: 'One-to-one Reiki with a trained healer. In person you lie down fully clothed; online, the same session is given as distance healing on a video call.',
    good: ['Stress and poor sleep', 'Body pain and low energy', 'Feeling heavy or stuck'] },
  { id: 'crystal-healing', name: 'Crystal Healing Therapy', mins: 60, img: '3d/svc-crystal', modes: ['offline'],
    text: 'Chakra stones are placed on the body to clear and balance each energy centre, followed by Reiki. Done in person only.',
    good: ['Chakra imbalance', 'Anxiety and overthinking', 'Low confidence'] },
  { id: 'evil-eye', name: 'Evil Eye (Nazar) Removal', mins: 45, img: '3d/svc-evil-eye', modes: ['offline', 'online'],
    text: 'Aura cleansing with Reiki and crystals for when things keep going wrong at home, at work or with health.',
    good: ['Sudden losses or delays', 'Repeated illness at home', 'Heaviness after meeting people'] },
  { id: 'meditation', name: 'Guided Meditation Class', mins: 60, img: '3d/svc-meditation', modes: ['offline', 'online'],
    text: 'Group meditation and breathing practice led by our healers. No experience needed.',
    good: ['Beginners', 'A busy, restless mind', 'Building a daily habit'] },
  { id: 'student-exams', name: 'Reiki for Students (Exams)', mins: 15, img: '3d/svc-students', modes: ['offline', 'online'],
    text: 'A short session before exams to help students stay calm and focused, and remember what they studied.',
    good: ['Board and entrance exams', 'Exam fear', 'Poor concentration'] }
];
const DISCOVERY = { id: 'discovery-call', name: 'Free Discovery Call', mins: 15, img: '3d/svc-consultation',
  text: 'A 15-minute phone or video call with a healer. Tell us what you are going through and we suggest the right session, crystal or course.' };

const COURSES = [
  { id: 'reiki-123', name: 'Reiki Level 1, 2 & 3 Certification', short: 'Reiki Level 1–3', img: '3d/course-reiki-123', days: 63, step: 1,
    req: 'None. Open to everyone',
    text: 'The complete Usui Reiki foundation in one programme: self-healing, healing family members and distance healing, with attunements by the Grand Master.',
    learn: ['Level 1: self-healing and hand positions', 'Level 2: Reiki symbols and distance healing', 'Level 3: deeper practice and attunement', 'A daily practice routine for home'] },
  { id: 'reiki-advance', name: 'Reiki Advance Healer', short: 'Advance Healer', img: '3d/course-advance', days: 21, step: 2,
    req: 'Reiki Level 3',
    text: 'For students who have finished Level 3 and want stronger, faster results when they heal themselves and others.',
    learn: ['Advanced healing techniques', 'Healing for specific problems', 'Protection techniques'] },
  { id: 'reiki-master', name: 'Reiki Master', short: 'Reiki Master', img: '3d/course-master', days: 30, step: 3,
    req: 'Reiki Advance Healer',
    text: 'The teacher level. Learn to give attunements and teach Reiki to others in the Usui lineage.',
    learn: ['Master symbol and the attunement process', 'How to teach and run classes', 'Healing at master level'] },
  { id: 'grand-master', name: 'Reiki Grand Master', short: 'Grand Master', img: '3d/course-grandmaster', days: null, step: 4,
    req: 'Reiki Master',
    text: 'The highest level in our lineage, for Reiki Masters who want to train and attune other masters.',
    learn: ['Grand Master attunement', 'Training and attuning Reiki Masters', 'Mass and group healing'] },
  { id: 'crystal-reiki', name: 'Crystal Reiki', short: 'Crystal Reiki', img: '3d/course-crystal', days: 30, step: 0,
    req: 'Reiki Level 1 to 3',
    text: 'Combine Reiki with crystals: which stone to use for which problem, how to cleanse and charge crystals, and how to build crystal grids.',
    learn: ['Choosing crystals by chakra and problem', 'Cleansing and charging crystals', 'Crystal grids and layouts'] },
  { id: 'vedic-numerology', name: 'Vedic Numerology', short: 'Vedic Numerology', img: '3d/course-numerology', days: 30, step: 0,
    req: 'None',
    text: 'Read a person’s birth number, destiny number and name number, and suggest remedies, lucky numbers and name corrections.',
    learn: ['Birth, destiny and name numbers', 'Lo Shu grid reading', 'Remedies and name correction'] }
];

const TEAM = {
  'chirag-gajjar': { name: 'Dr. Chirag Gajjar', cred: 'PhD', role: 'Founder · Reiki Grand Master',
    bio: 'Reiki Grand Master in the 11th generation of the Usui lineage, practising and teaching for over 25 years. He gives every attunement and personally Reiki-charges the crystals the centre sends out.' },
  'binal-gajjar': { name: 'Binal Gajjar', role: 'Co-founder · Crystal & Numerology Expert',
    bio: 'Over 10 years in crystal therapy, numerology and aura reading. She chooses the stones for every personal bracelet the centre makes.' },
  'varun-patel': { name: 'Dr. Varun Patel', cred: 'PhD', role: 'Head, Bengaluru Branch · Reiki Grand Master',
    bio: 'Reiki Grand Master and head of the Bengaluru branch. He leads healing sessions, Reiki classes and seminars in Bengaluru together with Dr. Chirag Gajjar.' },
  'ajay-sonavaria': { name: 'Ajay Sonavaria', role: 'Healing Training Expert',
    bio: 'Guides students through Reiki Level 1 and 2 and leads the meditation classes at the Surat centre.' },
  'rohit-singh': { name: 'Rohit Singh', role: 'Numerologist',
    bio: 'Works with Vedic and Western numerology and prepares the number readings behind every numerology bracelet.' }
};

// Real Google reviews of the Surat centre (short excerpts)
const REVIEWS = [
  { n: 'Shaznin Sanjana', t: 'Learning Reiki from Chirag Sir has been a wonderful journey… calm and welcoming atmosphere.' },
  { n: 'Mina Kanoje', t: 'Got a crystal bracelet… health, finance and overall life have become so positive. Home filled with peaceful and happy vibes.' },
  { n: 'Jinsi Passwala', t: 'Very calming and peaceful experience… highly recommended to reduce stress.' },
  { n: 'Radha Sherdiwala', t: 'After learning Reiki I saw many changes in my life.' },
  { n: 'Patel Nehal', t: 'Grateful and fortunate to have a mentor like Chirag Sir… Binal Ma’am and Ajay Sir.' },
  { n: 'Geeta Khambhati', t: 'The crystal Shiv Shakti class was transformative.' },
  { n: 'Ammita Agarwal', t: 'Learning Reiki was an amazing experience.' },
  { n: 'Dhara Vyas', t: 'Group prayers are most effective and powerful.' },
  { n: 'Anita Sant', t: 'A place where you find solitude… the whole team, Chirag Sir, Binal Ma’am and Ajaybhai.' }
];

const STATS = [['25+', 'years of Reiki practice'], ['30K+', 'lives healed'], ['25K+', 'healing sessions']];

// Awards with photos (from Dr. Chirag Gajjar's records)
const AWARDS = [
  { img: 'events/world-record-2025', t: 'World Record of Excellence, England', d: 'SIFA Book of Records · 11 Nov 2025' },
  { img: 'events/sgcci-medal-2025', t: 'Honoured at Aayush Conclave', d: 'SGCCI, Surat · 2025' },
  { img: 'events/award-aarogya-ratna-2022', t: 'Aarogya Ratna Award', d: '2022' },
  { img: 'events/traditional-healer-2018', t: 'Certified Traditional Healer', d: 'Federation of Traditional Medicine Practitioners · 2018' }
];
const MOMENTS = [
  { img: 'events/mass-healing-2025', t: '11:11 mass healing at the Aayush Conclave, Surat' },
  { img: 'events/group-meditation', t: 'Group meditation at the centre' },
  { img: 'events/attunement', t: 'A Reiki attunement' },
  { img: 'people/chirag-cave', t: 'Meditation retreat' }
];

const BLOG_IMG = {
  'what-is-reiki-beginners-guide': '3d/svc-reiki-720',
  '7-chakras-explained-blocked-energy': '3d/svc-crystal-720',
  'understanding-7-chakras-reiki-healing': '3d/course-crystal-720',
  'healing-physical-ailments-reiki-guide': '3d/course-reiki-123-720',
  'reiki-emotional-healing-mental-peace': '3d/svc-meditation-720',
  'reiki-for-digestive-disorders-relief': '3d/svc-consultation-720',
  'reiki-for-allergies-and-asthma-relief': '3d/course-advance-720',
  'reiki-healing-for-skin-diseases': '3d/svc-reiki-720',
  'manifesting-wishes-reiki-box-technique': '3d/course-grandmaster-720',
  'reiki-for-emergency-pain-relief': '3d/course-reiki-123-720',
  'reiki-for-asthma-respiratory-relief': '3d/svc-meditation-720',
  'reiki-for-thyroid-balance': '3d/svc-crystal-720',
  'reiki-first-aid-sharp-pain-relief': '3d/course-advance-720',
  'reiki-for-students-exam-success': '3d/svc-students-720',
  'reiki-healing-for-bone-pain-arthritis': '3d/svc-reiki-720',
  'reiki-treatment-for-depression-stress': '3d/course-master-720',
  'reiki-for-weight-loss-metabolism': '3d/svc-meditation-720',
  'reiki-for-pregnancy-miscarriage-prevention': '3d/svc-evil-eye-720',
  'reiki-for-addiction-recovery': '3d/svc-consultation-720',
  'reiki-relief-for-migraines-headaches': '3d/svc-crystal-720',
  'reiki-for-heart-health-blood-pressure': '3d/course-advance-720',
  'reiki-for-kidney-urinary-health': '3d/course-reiki-123-720',
  'karma-mukti-reiki-past-life-healing': '3d/course-grandmaster-720',
  'reiki-kavach-protection-technique': '3d/svc-evil-eye-720',
  'reiki-in-bangalore-guide': '3d/svc-distance-720',
  'reiki-course-in-bangalore': '3d/course-reiki-123-720',
  'reiki-for-stress-burnout-bangalore': '3d/svc-meditation-720',
  'distance-reiki-healing-online': '3d/svc-distance-720',
  'crystal-bracelets-bangalore-how-to-choose': '3d/course-crystal-720',
  'reiki-seminar-what-to-expect': '3d/course-master-720'
};

module.exports = { SITE, CITIES, INTENTS, CATS, BESTSELLERS, SERVICES, DISCOVERY, COURSES, TEAM, REVIEWS, STATS, AWARDS, MOMENTS, BLOG_IMG };
