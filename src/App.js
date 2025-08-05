import React, { useState, useMemo, useEffect } from 'react';
import { Package, ShoppingCart, Truck, Bell, AlertTriangle, ArrowRightLeft, PlusCircle, Search, Filter, User, Home, List, ArrowLeft, QrCode, Zap, CheckCircle, Clock, X, Camera, FileText, History, ThumbsUp, Send, Sparkles, AlertCircle, BarChart2, TrendingUp, Edit } from 'lucide-react';

// --- Firebase Imports ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    doc, 
    onSnapshot, 
    addDoc, 
    setDoc, 
    updateDoc, 
    writeBatch,
    getDocs,
    setLogLevel
} from 'firebase/firestore';

// --- Gemini API Configuration ---
const API_KEY = "process.env.REACT_APP_GEMINI_API_KEY"; // This will be provided by the environment.
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${API_KEY}`;


// --- Mock Data for Seeding ---
const hotels = [
    { id: 'H01', name: 'The Sands Khao Lak by Katathani' },
    { id: 'H02', name: 'The Leaf on The Sands Khao Lak by Katathani' },
    { id: 'H03', name: 'The Leaf Oceanside by Katathani' },
];
const CURRENT_HOTEL_ID = 'H03'; // The user is at The Leaf Oceanside

const initialStockDataList = [
    { id: 'STK-H03-001', hotelId: 'H03', hotelName: hotels[2].name, name: 'แครอท', unit: 'หัว', quantity: 5, lowStockThreshold: 10, category: 'ผัก', avgUse: 2, last7DaysUse: 14, lastUpdate: '2025-08-03T10:00:00Z' },
    { id: 'STK-H03-002', hotelId: 'H03', hotelName: hotels[2].name, name: 'กุ้งขาว', unit: 'กก.', quantity: 2, lowStockThreshold: 5, category: 'อาหารทะเล', avgUse: 1, last7DaysUse: 7, lastUpdate: '2025-08-03T12:30:00Z' },
    { id: 'STK-H03-003', hotelId: 'H03', hotelName: hotels[2].name, name: 'ไข่ไก่', unit: 'ฟอง', quantity: 40, lowStockThreshold: 50, category: 'ของแห้ง', avgUse: 10, last7DaysUse: 70, lastUpdate: '2025-08-02T09:00:00Z' },
    { id: 'STK-H03-004', hotelId: 'H03', hotelName: hotels[2].name, name: 'กระเทียม', unit: 'กก.', quantity: 15, lowStockThreshold: 5, category: 'ผัก', avgUse: 0.5, last7DaysUse: 3.5, lastUpdate: '2025-08-01T14:00:00Z' },
    { id: 'STK-H01-001', hotelId: 'H01', hotelName: hotels[0].name, name: 'เนื้อสันในวัว', unit: 'กก.', quantity: 20, lowStockThreshold: 8, category: 'เนื้อสัตว์', avgUse: 1.5, last7DaysUse: 10.5, lastUpdate: '2025-08-03T11:00:00Z' },
];

const suppliersData = [
    { id: 'sup-001', name: 'เขาหลักซีฟู้ด' },
    { id: 'sup-002', name: 'ร้านผักคุณป้า' },
    { id: 'sup-003', name: 'ซีพี เฟรชมาร์ท' },
];

const initialOrderDataList = [
    { id: 'ORD-001', date: '2025-08-03T10:00:00Z', supplier: 'เขาหลักซีฟู้ด', status: 'รอดำเนินการ', total: 1250.50, items: [{ name: 'กุ้งขาว', qty: 5, unit: 'กก.' }] },
    { id: 'ORD-002', date: '2025-08-02T15:30:00Z', supplier: 'ซีพี เฟรชมาร์ท', status: 'จัดส่งแล้ว', total: 800.00, items: [{ name: 'ไข่ไก่', qty: 10, unit: 'แผง' }] },
];

const initialDeliveryDataList = [
    { id: 'DEL-001', orderId: 'ORD-001', supplier: 'เขาหลักซีฟู้ด', status: 'รอจัดส่ง', scheduled: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(), actual: null, receiver: null, items: [{ name: 'กุ้งขาว', qty: 5, unit: 'กก.' }], slipImage: null, notes: null, issue: null },
    { id: 'DEL-002', orderId: 'ORD-002', supplier: 'ร้านผักคุณป้า', status: 'รอจัดส่ง', scheduled: new Date(new Date().setHours(9, 30, 0, 0)).toISOString(), actual: null, receiver: null, items: [{ name: 'แครอท', qty: 10, unit: 'กก.' }], slipImage: null, notes: "ยังไม่มาส่ง", issue: null },
    { id: 'DEL-003', orderId: 'ORD-003', supplier: 'ซีพี เฟรชมาร์ท', status: 'จัดส่งแล้ว', scheduled: '2025-08-03T15:00:00.000Z', actual: '2025-08-03T14:55:00.000Z', receiver: 'สมศรี', items: [{ name: 'ไข่ไก่', qty: 20, unit: 'แผง' }], slipImage: 'https://placehold.co/400x600/eee/ccc?text=ใบส่งของ', notes: null, issue: null },
    { id: 'DEL-004', orderId: 'ORD-004', supplier: 'เขาหลักซีฟู้ด', status: 'มีปัญหา', scheduled: '2025-08-03T10:30:00.000Z', actual: '2025-08-03T10:35:00.000Z', receiver: 'สมชาย', items: [{ name: 'ปลาหมึก', qty: 5, unit: 'กก.' }], slipImage: 'https://placehold.co/400x600/eee/ccc?text=ใบส่งของ', notes: "ของไม่สด", issue: { type: 'สินค้าเสียหาย', details: 'ปลาหมึกมีกลิ่นเหม็น' } },
    { id: 'DEL-005', orderId: 'ORD-005', supplier: 'ร้านผักคุณป้า', status: 'ล่าช้า', scheduled: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(), actual: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(), receiver: 'สมศรี', items: [{ name: 'มะเขือเทศ', qty: 15, unit: 'กก.' }], slipImage: null, notes: 'รถส่งของเสีย', issue: null },
];

const initialTransferDataList = [
    { id: 'TRN-001', fromHotelId: 'H01', fromHotelName: hotels[0].name, toHotelId: 'H03', toHotelName: hotels[2].name, items: [{ name: 'เนื้อสันในวัว', qty: 5, unit: 'กก.' }], reason: 'ของหมดกะทันหัน', requestDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), expectedDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), status: 'ได้รับแล้ว', approver: 'เชฟสมชาย (หน.แผนก)', sender: 'สมศักดิ์', receiver: 'สมศรี' }
];

// --- Firebase Configuration ---
// ดึงค่า Config มาจากไฟล์ .env ที่เราตั้งค่าไว้
const firebaseConfig = {
  apiKey: process.env.REACT_APP_API_KEY,
  authDomain: process.env.REACT_APP_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_PROJECT_ID,
  storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_APP_ID
};

// ตั้งค่าเริ่มต้นสำหรับ Token (เนื่องจากเราไม่ได้ใช้ ให้เป็น null)
const initialAuthToken = null;
// Main App Component
export default function App() {
    const [activePage, setActivePage] = useState('dashboard');
    const [db, setDb] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [stockData, setStockData] = useState([]);
    const [orderData, setOrderData] = useState([]);
    const [deliveryData, setDeliveryData] = useState([]);
    const [transferData, setTransferData] = useState([]);

    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const firestoreDb = getFirestore(app);
            const auth = getAuth(app);
            setDb(firestoreDb);
            onAuthStateChanged(auth, async (user) => {
                if (user) setIsAuthReady(true);
                else {
                    try {
                        if (initialAuthToken) await signInWithCustomToken(auth, initialAuthToken);
                        else await signInAnonymously(auth);
                    } catch (error) { console.error("Error signing in: ", error); setIsAuthReady(true); }
                }
            });
        } catch (e) { console.error("Firebase initialization error:", e); }
    }, []);
    
    const seedData = async (firestoreDb) => {
        const collectionsToSeed = { stock: initialStockDataList, orders: initialOrderDataList, deliveries: initialDeliveryDataList, transfers: initialTransferDataList };
        for (const [name, data] of Object.entries(collectionsToSeed)) {
            const ref = collection(firestoreDb, `/artifacts/${appId}/public/data/${name}`);
            const snapshot = await getDocs(ref);
            if (snapshot.empty) {
                console.log(`Seeding '${name}'...`);
                const batch = writeBatch(firestoreDb);
                data.forEach(item => batch.set(doc(ref, item.id), item));
                await batch.commit();
            }
        }
    };
    
    useEffect(() => {
        if (isAuthReady && db) {
            seedData(db);
            const collections = { stock: setStockData, orders: setOrderData, deliveries: setDeliveryData, transfers: setTransferData };
            const unsubscribers = Object.entries(collections).map(([name, setter]) => 
                onSnapshot(collection(db, `/artifacts/${appId}/public/data/${name}`), (snapshot) => setter(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))))
            );
            return () => unsubscribers.forEach(unsub => unsub());
        }
    }, [isAuthReady, db]);

    const lowStockItems = useMemo(() => stockData.filter(item => item.hotelId === CURRENT_HOTEL_ID && item.quantity < item.lowStockThreshold), [stockData]);
    
    const handleUpdateData = async (collectionName, data) => {
        if (!db) return;
        const docRef = doc(db, `/artifacts/${appId}/public/data/${collectionName}/${data.id}`);
        await setDoc(docRef, data, { merge: true });
    };

    const handleAddNewData = async (collectionName, data, prefix) => {
        if (!db) return;
        const id = `${prefix}-${Date.now()}`;
        const newData = { ...data, id, date: new Date().toISOString() };
        await setDoc(doc(db, `/artifacts/${appId}/public/data/${collectionName}/${id}`), newData);
    };

    const renderPage = () => {
        if (!isAuthReady) return <div className="flex justify-center items-center h-full"><p>กำลังเชื่อมต่อ...</p></div>;
        switch (activePage) {
            case 'dashboard': return <Dashboard setActivePage={setActivePage} lowStockItems={lowStockItems} deliveryData={deliveryData} />;
            case 'orders': return <OrderManagement orders={orderData} onAddNewOrder={(d) => handleAddNewData('orders', d, 'ORD')} lowStockItems={lowStockItems} />;
            case 'stock': return <StockTracking stockData={stockData} onUpdateStock={(d) => handleUpdateData('stock', d)} />;
            case 'delivery': return <DeliveryTracking deliveries={deliveryData} onUpdateDelivery={(d) => handleUpdateData('deliveries', d)} />;
            case 'transfer': return <TransferRequest transfers={transferData} stockData={stockData} onUpdateTransfer={(d) => handleUpdateData('transfers', d)} onAddNewTransfer={(d) => handleAddNewData('transfers', d, 'TRN')} />;
            default: return <Dashboard setActivePage={setActivePage} lowStockItems={lowStockItems} deliveryData={deliveryData} />;
        }
    };

    return (
        <div className="w-full min-h-screen bg-gray-50 flex justify-center">
            <div className="w-full max-w-sm h-screen bg-white shadow-2xl flex flex-col">
                <Header activePage={activePage} setActivePage={setActivePage} />
                <main className="flex-1 overflow-y-auto p-4 bg-white">
                    {renderPage()}
                </main>
                <BottomNavBar activePage={activePage} setActivePage={setActivePage} />
            </div>
        </div>
    );
}

function Header({ activePage, setActivePage }) {
    const pageTitles = { dashboard: 'SMART KITCHEN', orders: 'Order Management', stock: 'Stock Tracking', delivery: 'Delivery Tracking', transfer: 'Transfer Request' };
    return (
        <header className="bg-blue-600 text-white p-4 flex items-center relative shadow-md">
            {activePage !== 'dashboard' && (<button onClick={() => setActivePage('dashboard')} className="absolute left-4"><ArrowLeft className="w-6 h-6" /></button>)}
            <div className="flex-1 text-center"><h1 className="text-xl font-bold">{pageTitles[activePage]}</h1>{activePage === 'dashboard' && <p className="text-xs text-blue-200">ระบบบริหารจัดการครัว</p>}</div>
            <div className="w-6 h-6 absolute right-4"></div>
        </header>
    );
}

function BottomNavBar({ activePage, setActivePage }) {
    const navItems = [{ id: 'dashboard', icon: <Home /> }, { id: 'orders', icon: <List /> }, { id: 'stock', icon: <Package /> }, {id: 'delivery', icon: <Truck />}, { id: 'transfer', icon: <ArrowRightLeft /> }];
    return (
        <nav className="bg-white border-t border-gray-200 flex justify-around p-2 shadow-inner">
            {navItems.map(item => (<button key={item.id} onClick={() => setActivePage(item.id)} className={`flex flex-col items-center w-16 transition-colors duration-200 ${activePage === item.id ? 'text-blue-600' : 'text-gray-400'}`}>{React.cloneElement(item.icon, { className: 'w-7 h-7' })}</button>))}
        </nav>
    );
}

// --- Dashboard Page ---
function Dashboard({ setActivePage, lowStockItems, deliveryData }) {
    const lateDeliveries = deliveryData.filter(item => item.status === 'ล่าช้า' || (item.status === 'รอจัดส่ง' && new Date(item.scheduled) < new Date()));
    const menuItems = [
        { id: 'orders', label: 'Order Management', icon: <ShoppingCart className="w-8 h-8"/> }, 
        { id: 'stock', label: 'Stock Tracking', icon: <Package className="w-8 h-8"/> }, 
        { id: 'delivery', label: 'Delivery Tracking', icon: <Truck className="w-8 h-8"/> }, 
        { id: 'transfer', label: 'Transfer Request', icon: <ArrowRightLeft className="w-8 h-8"/> },
    ];
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">{menuItems.map(item => (<button key={item.id} onClick={() => setActivePage(item.id)} className="bg-gray-100 p-4 rounded-lg shadow flex flex-col items-center justify-center space-y-2 hover:bg-gray-200 transition-colors"><div className="text-blue-600">{item.icon}</div><span className="text-sm font-semibold text-gray-700">{item.label}</span></button>))}</div>
            <div className="space-y-4">
                <InfoCard title="Low Stock Items" items={lowStockItems} icon={<AlertTriangle className="text-red-500" />} emptyMessage="ไม่มีสินค้าใกล้หมด" />
                <InfoCard title="Late Deliveries" items={lateDeliveries} icon={<Bell className="text-yellow-500" />} emptyMessage="ไม่มีการจัดส่งที่ล่าช้า" />
            </div>
        </div>
    );
}

function InfoCard({ title, items, icon, emptyMessage }) {
    return (
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center mb-2">{icon}<h3 className="ml-2 font-bold text-gray-800">{title} ({items.length})</h3></div>
            {items.length > 0 ? (<ul className="space-y-1 text-sm text-gray-600">{items.map(item => (<li key={item.id} className="flex justify-between"><span>{item.name || item.supplier}</span><span className="font-semibold">{item.quantity !== undefined ? `${item.quantity} ${item.unit}` : item.status}</span></li>))}</ul>) : (<p className="text-sm text-gray-500">{emptyMessage}</p>)}
        </div>
    );
}

// --- Stock Tracking Page ---
function StockTracking({ stockData, onUpdateStock }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterHotel, setFilterHotel] = useState(CURRENT_HOTEL_ID);
    const [modalItem, setModalItem] = useState(null);

    const filteredStock = useMemo(() => {
        return stockData
            .filter(item => item.hotelId === filterHotel && item.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a,b) => a.name.localeCompare(b.name));
    }, [stockData, searchTerm, filterHotel]);

    return (
        <>
            {modalItem?.type === 'update' && <UpdateStockModal item={modalItem.data} onUpdateStock={onUpdateStock} onClose={() => setModalItem(null)} />}
            {modalItem?.type === 'history' && <ViewHistoryModal item={modalItem.data} onClose={() => setModalItem(null)} />}
            <div className="space-y-4">
                <h2 className="text-lg font-bold">ติดตามสต็อก</h2>
                <select value={filterHotel} onChange={e => setFilterHotel(e.target.value)} className="w-full p-2 border rounded-lg bg-white">
                    {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" /><input type="text" placeholder="ค้นหาวัตถุดิบ..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg" /></div>
                <div className="space-y-3">{filteredStock.map(item => <StockItemDetail key={item.id} item={item} onOpenModal={setModalItem} />)}</div>
            </div>
        </>
    );
}

function StockItemDetail({ item, onOpenModal }) {
    const [aiSuggestion, setAiSuggestion] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const daysLeft = item.avgUse > 0 ? Math.floor(item.quantity / item.avgUse) : Infinity;
    const isLow = item.quantity < item.lowStockThreshold;

    const handleGetAiSuggestion = async () => {
        setIsGenerating(true);
        setAiSuggestion('');
        const prompt = `สำหรับวัตถุดิบ '${item.name}' ที่มีอยู่ ${item.quantity} ${item.unit}, ใช้วันละประมาณ ${item.avgUse} ${item.unit}, และ 7 วันล่าสุดใช้ไป ${item.last7DaysUse} ${item.unit}. กรุณาให้คำแนะนำสั้นๆ ไม่เกิน 1 ประโยค สำหรับการจัดการสต็อกเป็นภาษาไทย พร้อมบอกว่าของจะหมดในอีกประมาณกี่วัน.`;
        const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
        try {
            const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error('API Error');
            const result = await response.json();
            const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
            setAiSuggestion(text || "ไม่สามารถสร้างคำแนะนำได้");
        } catch (error) {
            console.error("AI suggestion error:", error);
            setAiSuggestion("เกิดข้อผิดพลาดในการเรียก AI");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className={`p-4 rounded-lg shadow-sm border-l-4 ${isLow ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}`}>
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-lg text-gray-800">{item.name}</h3>
                    <p className={`font-extrabold text-2xl ${isLow ? 'text-red-600' : 'text-green-600'}`}>{item.quantity} <span className="text-base font-normal text-gray-500">{item.unit}</span></p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => onOpenModal({type: 'update', data: item})} className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => onOpenModal({type: 'history', data: item})} className="p-2 bg-gray-200 text-gray-600 rounded-full hover:bg-gray-300"><History className="w-4 h-4" /></button>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-gray-600 mt-3">
                <div className="flex items-center gap-1"><TrendingUp className="w-3 h-3"/><span>เฉลี่ย/วัน: {item.avgUse} {item.unit}</span></div>
                <div className="flex items-center gap-1"><TrendingUp className="w-3 h-3"/><span>ใช้ 7 วันล่าสุด: {item.last7DaysUse} {item.unit}</span></div>
                <div className="flex items-center gap-1"><Clock className="w-3 h-3"/><span>คาดว่าจะหมดใน: {daysLeft === Infinity ? 'N/A' : `${daysLeft} วัน`}</span></div>
                <div className="flex items-center gap-1"><FileText className="w-3 h-3"/><span>อัปเดตล่าสุด: {new Date(item.lastUpdate).toLocaleDateString('th-TH')}</span></div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200">
                <button onClick={handleGetAiSuggestion} disabled={isGenerating} className="flex items-center gap-2 text-sm text-purple-600 font-semibold disabled:text-gray-400">
                    <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                    <span>{isGenerating ? 'AI กำลังคิด...' : 'AI Suggestion'}</span>
                </button>
                {aiSuggestion && <p className="mt-2 text-sm text-purple-800 bg-purple-100 p-2 rounded-md">{aiSuggestion}</p>}
            </div>
        </div>
    );
}

function UpdateStockModal({ item, onUpdateStock, onClose }) {
    const [newQuantity, setNewQuantity] = useState(item.quantity);
    const handleSubmit = (e) => {
        e.preventDefault();
        onUpdateStock({ ...item, quantity: parseFloat(newQuantity), lastUpdate: new Date().toISOString() });
        onClose();
    };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={onClose}>
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-xl w-11/12 max-w-sm" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4">อัปเดตสต็อก: {item.name}</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">จำนวนคงเหลือใหม่ ({item.unit})</label>
                        <input type="number" step="any" value={newQuantity} onChange={e => setNewQuantity(e.target.value)} className="mt-1 block w-full p-2 border-gray-300 rounded-md" required />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-lg">ยกเลิก</button>
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg">บันทึก</button>
                    </div>
                </div>
            </form>
        </div>
    );
}

function ViewHistoryModal({ item, onClose }) {
    const mockHistory = [
        { date: '2025-08-03T12:30:00Z', change: -5, reason: 'ใช้งานปกติ' },
        { date: '2025-08-02T09:00:00Z', change: +50, reason: 'รับของ' },
        { date: '2025-08-01T18:00:00Z', change: -7, reason: 'ใช้งานปกติ' },
    ];
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-white p-6 rounded-lg shadow-xl w-11/12 max-w-sm" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4">ประวัติสต็อก: {item.name}</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {mockHistory.map((entry, i) => (
                        <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <div>
                                <p className="text-sm font-semibold">{new Date(entry.date).toLocaleString('th-TH')}</p>
                                <p className="text-xs text-gray-500">{entry.reason}</p>
                            </div>
                            <p className={`font-bold ${entry.change > 0 ? 'text-green-600' : 'text-red-600'}`}>{entry.change > 0 ? '+' : ''}{entry.change} {item.unit}</p>
                        </div>
                    ))}
                </div>
                <button onClick={onClose} className="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded-lg">ปิด</button>
            </div>
        </div>
    );
}

// --- Order Management Page ---
function OrderManagement({ orders, onAddNewOrder, lowStockItems }) {
    const [view, setView] = useState('list');
    const [filterStatus, setFilterStatus] = useState('ทั้งหมด');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredOrders = useMemo(() => {
        return orders
            .filter(order => {
                const statusMatch = filterStatus === 'ทั้งหมด' || order.status === filterStatus;
                const searchMatch = order.supplier.toLowerCase().includes(searchTerm.toLowerCase());
                return statusMatch && searchMatch;
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [orders, filterStatus, searchTerm]);

    if (view === 'new') return <NewOrderForm onBack={() => setView('list')} onAddNewOrder={onAddNewOrder} lowStockItems={lowStockItems} />;
    
    const statusOptions = ['ทั้งหมด', 'รอดำเนินการ', 'จัดส่งแล้ว', 'ยกเลิก'];

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center"><h2 className="text-lg font-bold">ประวัติการสั่งซื้อ</h2><button onClick={() => setView('new')} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"><PlusCircle className="w-5 h-5" /><span>สร้าง Order</span></button></div>
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" /><input type="text" placeholder="ค้นหาจากซัพพลายเออร์..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg" /></div>
            <div className="flex gap-2">{statusOptions.map(status => <button key={status} onClick={() => setFilterStatus(status)} className={`px-3 py-1 text-sm rounded-full ${filterStatus === status ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>{status}</button>)}</div>
            <div className="space-y-3">{filteredOrders.map(order => <OrderItem key={order.id} order={order} />)}</div>
        </div>
    );
}
function OrderItem({ order }) {
    const statusStyles = { 'รอดำเนินการ': 'bg-yellow-100 text-yellow-800', 'จัดส่งแล้ว': 'bg-green-100 text-green-800', 'ยกเลิก': 'bg-red-100 text-red-800' };
    const totalFormatted = order.total ? order.total.toLocaleString('th-TH', { style: 'currency', currency: 'THB' }) : 'N/A';
    return (
        <div className="p-3 rounded-lg shadow-sm border bg-white">
            <div className="flex justify-between items-start"><div><p className="font-bold">{order.supplier}</p><p className="text-xs text-gray-500">ID: {order.id}</p></div><span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[order.status]}`}>{order.status}</span></div>
            <div className="mt-2 text-sm space-y-1">{order.items.map((item, index) => (<div key={index} className="flex justify-between"><span>{item.name} ({item.qty} {item.unit})</span></div>))}</div>
            <div className="mt-2 pt-2 border-t flex justify-between items-center"><span className="text-xs text-gray-500">วันที่สั่ง: {new Date(order.date).toLocaleDateString('th-TH')}</span><span className="font-bold text-gray-800">{totalFormatted}</span></div>
        </div>
    );
}
function NewOrderForm({ onBack, onAddNewOrder, lowStockItems }) {
    const [supplier, setSupplier] = useState('');
    const [items, setItems] = useState([{ name: '', qty: '', unit: '' }]);
    const [isGenerating, setIsGenerating] = useState(false);
    const handleItemChange = (index, field, value) => { const newItems = [...items]; newItems[index][field] = value; setItems(newItems); };
    const handleAddItem = () => setItems([...items, { name: '', qty: '', unit: '' }]);
    const handleSubmit = (e) => { e.preventDefault(); onAddNewOrder({ supplier, items: items.filter(item => item.name && item.qty), status: 'รอดำเนินการ', total: 0 }); onBack(); };
    const handleAiSuggest = async () => {
        if (!lowStockItems || lowStockItems.length === 0) { alert("ไม่มีสินค้าใกล้หมดในขณะนี้"); return; }
        setIsGenerating(true);
        const prompt = `ฉันเป็นเชฟที่กำลังจัดการสต็อกวัตถุดิบในครัว ตอนนี้มีของใกล้หมดดังนี้: ${lowStockItems.map(i => `${i.name} (เหลือ ${i.quantity} ${i.unit}, เกณฑ์ของน้อยคือ ${i.lowStockThreshold})`).join(', ')} กรุณาสร้างรายการสั่งซื้อที่แนะนำเพื่อเติมสต็อกสินค้าเหล่านี้ ตอบกลับเป็น JSON array ของ object ที่แต่ละ object มี property 'name' (string), 'qty' (number), และ 'unit' (string) โดยจำนวนที่สั่งควรเหมาะสมสำหรับร้านอาหาร`;
        const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", responseSchema: { type: "ARRAY", items: { type: "OBJECT", properties: { "name": { "type": "STRING" }, "qty": { "type": "NUMBER" }, "unit": { "type": "STRING" } }, required: ["name", "qty", "unit"] } } } };
        try {
            const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error(`API call failed: ${response.status}`);
            const result = await response.json();
            const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) { const suggestedItems = JSON.parse(text); setItems(suggestedItems.filter(item => item.name && item.qty && item.unit)); }
        } catch (error) { console.error("Error calling Gemini API:", error); alert("ไม่สามารถสร้างรายการแนะนำจาก AI ได้"); } finally { setIsGenerating(false); }
    };
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between"><div className="flex items-center gap-4"><button onClick={onBack} className="text-gray-600"><ArrowLeft /></button><h2 className="text-lg font-bold">สร้างรายการสั่งซื้อใหม่</h2></div><button onClick={handleAiSuggest} disabled={isGenerating || lowStockItems.length === 0} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-purple-600 rounded-lg shadow-sm hover:bg-purple-700 disabled:bg-gray-400"><Sparkles className="w-4 h-4" /><span>{isGenerating ? 'กำลังสร้าง...' : 'AI แนะนำ'}</span></button></div>
            <form onSubmit={handleSubmit} className="space-y-4 bg-gray-50 p-4 rounded-lg">
                <div><label className="block text-sm font-medium text-gray-700">ซัพพลายเออร์</label><select value={supplier} onChange={e => setSupplier(e.target.value)} required className="mt-1 block w-full p-2 border-gray-300 rounded-md"><option value="">เลือกซัพพลายเออร์</option>{suppliersData.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select></div>
                {items.map((item, index) => (<div key={index} className="grid grid-cols-5 gap-2"><input type="text" placeholder="ชื่อสินค้า" value={item.name} onChange={e => handleItemChange(index, 'name', e.target.value)} className="col-span-3 p-2 border rounded-md" /><input type="number" placeholder="จำนวน" value={item.qty} onChange={e => handleItemChange(index, 'qty', e.target.value)} className="p-2 border rounded-md" /><input type="text" placeholder="หน่วย" value={item.unit} onChange={e => handleItemChange(index, 'unit', e.target.value)} className="p-2 border rounded-md" /></div>))}
                <button type="button" onClick={handleAddItem} className="text-blue-600 text-sm flex items-center gap-1"><PlusCircle className="w-4 h-4" /> เพิ่มรายการ</button>
                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">สร้าง Order</button>
            </form>
        </div>
    );
}

// --- Delivery Tracking Page ---
function DeliveryTracking({ deliveries, onUpdateDelivery }) {
    const [view, setView] = useState('list');
    const [selectedDelivery, setSelectedDelivery] = useState(null);
    const [historySupplier, setHistorySupplier] = useState(null);
    const handleSelectDelivery = (delivery) => { setSelectedDelivery(delivery); setView('detail'); };
    const handleViewHistory = (supplierName) => { setHistorySupplier(supplierName); setView('history'); };
    const handleBackToList = () => { setView('list'); setSelectedDelivery(null); setHistorySupplier(null); };
    const renderContent = () => {
        switch (view) {
            case 'detail': return <DeliveryDetail delivery={selectedDelivery} onBack={handleBackToList} onUpdateDelivery={onUpdateDelivery} onViewHistory={handleViewHistory} />;
            case 'history': return <SupplierHistoryView supplierName={historySupplier} deliveries={deliveries} onBack={handleBackToList} onSelectDelivery={handleSelectDelivery} />;
            default: return <DeliveryList deliveries={deliveries} onSelectDelivery={handleSelectDelivery} />;
        }
    };
    return (<div className="space-y-4"><h2 className="text-lg font-bold">ติดตามการจัดส่ง</h2>{renderContent()}</div>);
}
function DeliveryList({ deliveries, onSelectDelivery }) {
    const [qrModalData, setQrModalData] = useState(null);
    const groupedDeliveries = useMemo(() => {
        const groups = deliveries.reduce((acc, delivery) => { const date = new Date(delivery.scheduled).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }); if (!acc[date]) acc[date] = []; acc[date].push(delivery); return acc; }, {});
        return Object.entries(groups).sort(([dateA], [dateB]) => new Date(dateB.split('/').reverse().join('-')) - new Date(dateA.split('/').reverse().join('-')));
    }, [deliveries]);
    return (<>{qrModalData && <QRCodeModal data={qrModalData} title="QR Code สำหรับรับของ" onClose={() => setQrModalData(null)} />}<div className="space-y-4">{groupedDeliveries.map(([date, deliveryGroup]) => (<div key={date}><h3 className="font-semibold text-gray-600 bg-gray-100 p-2 rounded -mx-4 px-4">{date}</h3><div className="space-y-3 pt-3">{deliveryGroup.map(delivery => (<DeliveryItem key={delivery.id} delivery={delivery} onSelect={() => onSelectDelivery(delivery)} onShowQr={() => setQrModalData(delivery.id)} />))}</div></div>))}</div></>);
}
function DeliveryItem({ delivery, onSelect, onShowQr }) {
    const isOverdue = delivery.status === 'รอจัดส่ง' && new Date(delivery.scheduled) < new Date();
    const statusInfo = { 'รอจัดส่ง': { style: 'border-blue-500 bg-blue-50', icon: <Clock className="w-4 h-4 text-blue-600" /> }, 'จัดส่งแล้ว': { style: 'border-green-500 bg-green-50', icon: <CheckCircle className="w-4 h-4 text-green-600" /> }, 'ล่าช้า': { style: 'border-yellow-500 bg-yellow-50', icon: <AlertTriangle className="w-4 h-4 text-yellow-600" /> }, 'มีปัญหา': { style: 'border-red-500 bg-red-50', icon: <AlertCircle className="w-4 h-4 text-red-600" /> } };
    const currentStatus = statusInfo[delivery.status] || statusInfo['รอจัดส่ง'];
    return (<div className={`p-3 rounded-lg shadow-sm border-l-4 ${currentStatus.style} flex items-center gap-3`}><div className="flex-1 cursor-pointer" onClick={onSelect}><div className="flex justify-between items-center"><span className="font-bold text-gray-800">{delivery.supplier}</span></div><div className="flex items-center text-xs text-gray-500 mt-1 gap-2">{currentStatus.icon}<span>{delivery.status}</span>{isOverdue && <span className="text-red-500 font-bold animate-pulse">(เกินกำหนด!)</span>}</div></div><button onClick={onShowQr} className="p-2 bg-gray-200 rounded-md hover:bg-gray-300"><QrCode className="w-6 h-6 text-gray-700" /></button></div>);
}
function DeliveryDetail({ delivery, onBack, onUpdateDelivery, onViewHistory }) {
    const [isReportingIssue, setIsReportingIssue] = useState(false);
    const handleConfirmReceive = () => { onUpdateDelivery({ ...delivery, status: 'จัดส่งแล้ว', actual: new Date().toISOString(), receiver: 'สมชาย (คุณ)' }); };
    const handleReportIssue = (issue) => { onUpdateDelivery({ ...delivery, status: 'มีปัญหา', issue: issue }); setIsReportingIssue(false); };
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('th-TH', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };
    return (<>{isReportingIssue && <ReportIssueModal delivery={delivery} onClose={() => setIsReportingIssue(false)} onReport={handleReportIssue} />}<div className="space-y-4"><div className="flex items-center gap-4"><button onClick={onBack} className="text-gray-600"><ArrowLeft /></button><h2 className="text-lg font-bold">รายละเอียดการจัดส่ง</h2></div><div className="p-4 bg-gray-50 rounded-lg space-y-4"><p><strong>ซัพพลายเออร์:</strong> {delivery.supplier}</p><p><strong>สถานะ:</strong> {delivery.status}</p><p><strong>กำหนดส่ง:</strong> {formatDate(delivery.scheduled)}</p><p><strong>ส่งจริง:</strong> {formatDate(delivery.actual)}</p><p><strong>ผู้รับ:</strong> {delivery.receiver || 'N/A'}</p><div><strong>รายการสินค้า:</strong><ul className="list-disc list-inside text-sm text-gray-600">{delivery.items.map((item, i) => <li key={i}>{item.name} ({item.qty} {item.unit})</li>)}</ul></div>{delivery.issue && (<div className="p-2 bg-red-100 border-l-4 border-red-500 text-red-700"><p><strong>ปัญหาที่รายงาน:</strong> {delivery.issue.type}</p><p className="text-sm">{delivery.issue.details}</p></div>)}<div><label className="block text-sm font-medium text-gray-700">รูปภาพใบส่งของ</label>{delivery.slipImage ? (<img src={delivery.slipImage} alt="ใบส่งของ" className="mt-1 rounded-lg w-full h-auto" />) : (<button className="mt-1 w-full flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg text-gray-400 hover:bg-gray-100"><Camera className="w-8 h-8" /><span>อัปโหลดรูปภาพ</span></button>)}</div><div className="grid grid-cols-2 gap-2"><button onClick={() => onViewHistory(delivery.supplier)} className="w-full bg-gray-200 text-gray-800 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-300"><History className="w-5 h-5" /><span>ดูประวัติ</span></button><button onClick={() => setIsReportingIssue(true)} className="w-full bg-yellow-500 text-white py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-yellow-600"><AlertCircle className="w-5 h-5" /><span>แจ้งปัญหา</span></button></div>{delivery.status === 'รอจัดส่ง' && (<button onClick={handleConfirmReceive} className="w-full bg-green-600 text-white py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-green-700 font-bold"><CheckCircle className="w-6 h-6" /><span>CONFIRM RECEIVED</span></button>)}</div></div></>);
}
function ReportIssueModal({ delivery, onClose, onReport }) {
    const [issueType, setIssueType] = useState('ส่งช้า');
    const [details, setDetails] = useState('');
    const handleSubmit = (e) => { e.preventDefault(); onReport({ type: issueType, details }); };
    return (<div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={onClose}><form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-xl w-11/12 max-w-sm" onClick={e => e.stopPropagation()}><h3 className="text-lg font-bold mb-4">รายงานปัญหาการจัดส่ง</h3><div className="space-y-4"><div><label className="block text-sm font-medium text-gray-700">ประเภทปัญหา</label><select value={issueType} onChange={e => setIssueType(e.target.value)} className="mt-1 block w-full p-2 border-gray-300 rounded-md"><option>ส่งช้า</option><option>ส่งไม่ครบ</option><option>สินค้าเสียหาย</option><option>อื่นๆ</option></select></div><div><label className="block text-sm font-medium text-gray-700">รายละเอียด</label><textarea value={details} onChange={e => setDetails(e.target.value)} rows="3" className="mt-1 block w-full p-2 border-gray-300 rounded-md" placeholder="เช่น ของมาส่งช้า 1 ชั่วโมง, ขาดไข่ไก่ 2 แผง..."></textarea></div><div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-lg">ยกเลิก</button><button type="submit" className="bg-red-600 text-white px-4 py-2 rounded-lg">ส่งรายงาน</button></div></div></form></div>);
}
function SupplierHistoryView({ supplierName, deliveries, onBack, onSelectDelivery }) {
    const history = deliveries.filter(d => d.supplier === supplierName).sort((a,b) => new Date(b.scheduled) - new Date(a.scheduled));
    return (<div className="space-y-4"><div className="flex items-center gap-4"><button onClick={onBack} className="text-gray-600"><ArrowLeft /></button><div><h2 className="text-lg font-bold">ประวัติการจัดส่ง</h2><p className="text-sm text-gray-600">{supplierName}</p></div></div><div className="space-y-3">{history.length > 0 ? history.map(d => (<DeliveryItem key={d.id} delivery={d} onSelect={() => onSelectDelivery(d)} onShowQr={() => {}} />)) : (<p className="text-gray-500 text-center p-4">ไม่มีประวัติการจัดส่งจากร้านนี้</p>)}</div></div>);
}

// --- Transfer Request Page ---
function TransferRequest({ transfers, stockData, onUpdateTransfer, onAddNewTransfer }) {
    const [view, setView] = useState('list');
    const [selectedTransfer, setSelectedTransfer] = useState(null);
    const handleSelect = (transfer) => { setSelectedTransfer(transfer); setView('detail'); };
    const handleBack = () => setView('list');
    const renderContent = () => {
        switch (view) {
            case 'detail': return <TransferDetail transfer={selectedTransfer} onBack={handleBack} onUpdateTransfer={onUpdateTransfer} />;
            case 'new': return <NewTransferForm onBack={handleBack} onAddNewTransfer={onAddNewTransfer} stockData={stockData} />;
            case 'stats': return <TransferStats transfers={transfers} onBack={handleBack} />;
            default: return <TransferList transfers={transfers} onSelect={handleSelect} onSetView={setView} />;
        }
    };
    return (<div className="space-y-4"><h2 className="text-lg font-bold">โอนย้ายสินค้าระหว่างสาขา</h2>{renderContent()}</div>);
}
function TransferList({ transfers, onSelect, onSetView }) {
    const sortedTransfers = useMemo(() => [...transfers].sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate)), [transfers]);
    return (
        <div className="space-y-4">
            <div className="flex gap-2"><button onClick={() => onSetView('new')} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700"><PlusCircle className="w-5 h-5" /><span>สร้างใบขอยืม</span></button><button onClick={() => onSetView('stats')} className="flex-1 bg-gray-200 px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-300"><BarChart2 className="w-5 h-5" /><span>สถิติ</span></button></div>
            <div className="space-y-3">{sortedTransfers.map(t => <TransferItem key={t.id} transfer={t} onSelect={() => onSelect(t)} />)}</div>
        </div>
    );
}
function TransferItem({ transfer, onSelect }) {
    const isOutgoing = transfer.fromHotelId === CURRENT_HOTEL_ID;
    const statusStyles = { 'รออนุมัติ': 'bg-yellow-100 text-yellow-800', 'กำลังจัดส่ง': 'bg-blue-100 text-blue-800', 'ได้รับแล้ว': 'bg-green-100 text-green-800', 'มีปัญหา': 'bg-red-100 text-red-800' };
    return (
        <button onClick={onSelect} className="w-full text-left p-3 rounded-lg shadow-sm border-l-4 bg-white border-gray-300 hover:bg-gray-50">
            <div className="flex justify-between items-start">
                <div><p className="font-bold">{transfer.items[0].name}{transfer.items.length > 1 ? ` และอื่นๆ` : ''}</p><p className="text-sm text-gray-600">{isOutgoing ? `ถึง: ${transfer.toHotelName}` : `จาก: ${transfer.fromHotelName}`}</p></div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[transfer.status] || 'bg-gray-100'}`}>{transfer.status}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{new Date(transfer.requestDate).toLocaleDateString('th-TH')}</p>
        </button>
    );
}
function TransferDetail({ transfer, onBack, onUpdateTransfer }) {
    const [qrModalData, setQrModalData] = useState(null);
    const isUserAtOrigin = transfer.fromHotelId === CURRENT_HOTEL_ID;
    const isUserAtDestination = transfer.toHotelId === CURRENT_HOTEL_ID;
    const handleApprove = () => onUpdateTransfer({ ...transfer, status: 'กำลังจัดส่ง', approver: 'เชฟใหญ่ (คุณ)' });
    const handleScanReceive = () => onUpdateTransfer({ ...transfer, status: 'ได้รับแล้ว', receiver: 'สมชาย (คุณ)' });
    return (
        <>{qrModalData && <QRCodeModal data={qrModalData} title="QR Code สำหรับส่งของ" onClose={() => setQrModalData(null)} />}
        <div className="space-y-4">
            <div className="flex items-center gap-4"><button onClick={onBack} className="text-gray-600"><ArrowLeft /></button><h2 className="text-lg font-bold">รายละเอียดใบขอยืม</h2></div>
            <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <p><strong>จาก:</strong> {transfer.fromHotelName}</p><p><strong>ถึง:</strong> {transfer.toHotelName}</p><p><strong>สถานะ:</strong> {transfer.status}</p><p><strong>วันที่ขอ:</strong> {new Date(transfer.requestDate).toLocaleString('th-TH')}</p><p><strong>วันคาดว่าจะได้รับ:</strong> {new Date(transfer.expectedDate).toLocaleString('th-TH')}</p><p><strong>ผู้อนุมัติ (หน.แผนก):</strong> {transfer.approver || 'รออนุมัติ'}</p>
                <div><strong>รายการที่ขอยืม:</strong><ul className="list-disc list-inside text-sm text-gray-600">{transfer.items.map((item, i) => <li key={i}>{item.name} ({item.qty} {item.unit})</li>)}</ul></div>
                <p><strong>เหตุผล:</strong> {transfer.reason}</p>
                {isUserAtOrigin && transfer.status === 'รออนุมัติ' && <button onClick={handleApprove} className="w-full bg-green-600 text-white py-2 rounded-lg font-bold">อนุมัติการยืม</button>}
                {isUserAtOrigin && transfer.status === 'กำลังจัดส่ง' && <button onClick={() => setQrModalData(transfer.id)} className="w-full bg-blue-500 text-white py-2 rounded-lg flex items-center justify-center gap-2"><QrCode/>แนบ QR สำหรับส่งของ</button>}
                {isUserAtDestination && transfer.status === 'กำลังจัดส่ง' && <button onClick={handleScanReceive} className="w-full bg-teal-500 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2"><Camera/>SCAN to RECEIVE</button>}
            </div>
        </div>
        </>
    );
}
function NewTransferForm({ onBack, onAddNewTransfer, stockData }) {
    const [toHotelId, setToHotelId] = useState('');
    const [items, setItems] = useState([{ name: '', qty: '', unit: '' }]);
    const [reason, setReason] = useState('');
    const [expectedDate, setExpectedDate] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const handleItemChange = (index, field, value) => { const newItems = [...items]; newItems[index][field] = value; setItems(newItems); };
    const handleAddItem = () => setItems([...items, { name: '', qty: '', unit: '' }]);
    const handleAiSuggest = async () => {
        setIsGenerating(true);
        const lowStockAtCurrentHotel = stockData.filter(i => i.hotelId === CURRENT_HOTEL_ID && i.quantity < i.lowStockThreshold);
        if (lowStockAtCurrentHotel.length === 0) { alert("ไม่มีวัตถุดิบใกล้หมดที่สาขาของคุณ"); setIsGenerating(false); return; }
        const otherHotelsStock = stockData.filter(i => i.hotelId !== CURRENT_HOTEL_ID);
        const prompt = `ฉันเป็นเชฟที่ ${hotels.find(h=>h.id === CURRENT_HOTEL_ID).name} และของใกล้หมดคือ: ${lowStockAtCurrentHotel.map(i=>i.name).join(', ')}. กรุณาตรวจสอบสต็อกของโรงแรมอื่น: ${JSON.stringify(otherHotelsStock)} และแนะนำการขอยืมจากโรงแรมที่มีของเยอะที่สุดสำหรับแต่ละรายการ. ตอบกลับเป็น JSON object ที่มี property "toHotelId" (string) และ "items" (array of objects with "name", "qty", "unit").`;
        const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
        try {
            const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            const result = await response.json();
            const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) { const suggestion = JSON.parse(text.replace(/```json\n?/, "").replace(/```$/, "")); setToHotelId(suggestion.toHotelId); setItems(suggestion.items); setReason(`AI แนะนำ: ขอยืมเนื่องจากสต็อกต่ำ`); }
        } catch (error) { console.error("Gemini API Error:", error); alert("ไม่สามารถสร้างรายการแนะนำจาก AI ได้"); } finally { setIsGenerating(false); }
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        const fromHotel = hotels.find(h => h.id === CURRENT_HOTEL_ID);
        const toHotel = hotels.find(h => h.id === toHotelId);
        onAddNewTransfer({ fromHotelId: fromHotel.id, fromHotelName: fromHotel.name, toHotelId: toHotel.id, toHotelName: toHotel.name, items: items.filter(i => i.name && i.qty), reason, expectedDate, status: 'รออนุมัติ' });
        onBack();
    };
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between"><div className="flex items-center gap-4"><button onClick={onBack} className="text-gray-600"><ArrowLeft /></button><h2 className="text-lg font-bold">สร้างใบขอยืม</h2></div><button onClick={handleAiSuggest} disabled={isGenerating} className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-gray-400"><Sparkles className="w-4 h-4" />{isGenerating ? 'กำลังคิด...' : 'AI แนะนำ'}</button></div>
            <form onSubmit={handleSubmit} className="space-y-4 bg-gray-50 p-4 rounded-lg">
                <div><label className="block text-sm font-medium text-gray-700">ขอยืมจาก</label><select value={toHotelId} onChange={e => setToHotelId(e.target.value)} required className="mt-1 block w-full p-2 border-gray-300 rounded-md"><option value="">--เลือกโรงแรม--</option>{hotels.filter(h => h.id !== CURRENT_HOTEL_ID).map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select></div>
                {items.map((item, index) => (<div key={index} className="grid grid-cols-5 gap-2"><input type="text" placeholder="ชื่อวัตถุดิบ" value={item.name} onChange={e => handleItemChange(index, 'name', e.target.value)} className="col-span-3 p-2 border rounded-md" /><input type="number" placeholder="จำนวน" value={item.qty} onChange={e => handleItemChange(index, 'qty', e.target.value)} className="p-2 border rounded-md" /><input type="text" placeholder="หน่วย" value={item.unit} onChange={e => handleItemChange(index, 'unit', e.target.value)} className="p-2 border rounded-md" /></div>))}
                <button type="button" onClick={handleAddItem} className="text-blue-600 text-sm flex items-center gap-1"><PlusCircle className="w-4 h-4" /> เพิ่มรายการ</button>
                <div><label className="block text-sm font-medium text-gray-700">วันคาดว่าจะได้รับ</label><input type="datetime-local" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} required className="mt-1 block w-full p-2 border-gray-300 rounded-md" /></div>
                <div><label className="block text-sm font-medium text-gray-700">เหตุผล</label><textarea value={reason} onChange={e => setReason(e.target.value)} required rows="2" className="mt-1 block w-full p-2 border-gray-300 rounded-md"></textarea></div>
                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg">ส่งคำขอ</button>
            </form>
        </div>
    );
}
function TransferStats({ transfers, onBack }) {
    const stats = useMemo(() => {
        const hotelStats = hotels.reduce((acc, hotel) => { acc[hotel.id] = { name: hotel.name, sent: 0, received: 0 }; return acc; }, {});
        transfers.forEach(t => { if (hotelStats[t.fromHotelId]) hotelStats[t.fromHotelId].sent++; if (hotelStats[t.toHotelId]) hotelStats[t.toHotelId].received++; });
        return Object.values(hotelStats);
    }, [transfers]);
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4"><button onClick={onBack} className="text-gray-600"><ArrowLeft /></button><h2 className="text-lg font-bold">สถิติการขอยืม</h2></div>
            <div className="p-4 bg-gray-50 rounded-lg"><h3 className="font-bold mb-2">จำนวนครั้งที่ขอยืม/ให้ยืม</h3><div className="space-y-2">{stats.map(s => (<div key={s.name} className="p-2 bg-white rounded-md shadow-sm"><p className="font-semibold">{s.name}</p><div className="flex items-center gap-4 text-sm"><p className="text-orange-600">ให้ยืม: <span className="font-bold">{s.sent}</span> ครั้ง</p><p className="text-green-600">ขอยืม: <span className="font-bold">{s.received}</span> ครั้ง</p></div></div>))}</div></div>
        </div>
    );
}
function QRCodeModal({ data, title, onClose }) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-white p-6 rounded-lg shadow-xl text-center" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4">{title}</h3><img src={qrUrl} alt="QR Code" className="mx-auto" /><p className="text-sm text-gray-500 mt-4">ID: {data}</p><button onClick={onClose} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg">ปิด</button>
            </div>
        </div>
    );
}
