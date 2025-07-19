import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithPopup, 
    GoogleAuthProvider, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut 
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    addDoc, 
    query, 
    getDocs, 
    where, 
    deleteDoc,
    updateDoc
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ArrowLeft, PlusCircle, UserCircle, ShoppingCart, BarChart2, LogOut, Package, Trash2, Edit, Save, XCircle, Search, Calendar, Printer, ShieldCheck } from 'lucide-react';

// --- Firebase Configuration ---
// This configuration will be provided by the environment
const firebaseConfig = typeof __firebase_config !== 'undefined' 
    ? JSON.parse(__firebase_config) 
    : {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_AUTH_DOMAIN",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_STORAGE_BUCKET",
        messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
        appId: "YOUR_APP_ID"
    };

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// --- Main App Component ---
export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pos');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return <div className="flex items-center justify-center h-screen bg-gray-100"><div className="text-xl font-semibold">Loading...</div></div>;
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'profile':
                return <Profile user={user} />;
            case 'items':
                return <Items user={user} />;
            case 'reports':
                return <Reports user={user} />;
            case 'pos':
            default:
                return <POS user={user} setActiveTab={setActiveTab} />;
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen font-sans">
            {user ? (
                <div className="flex flex-col md:flex-row">
                    <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
                    <main className="flex-1 p-4 md:p-6 lg:p-8">
                        {renderContent()}
                    </main>
                </div>
            ) : (
                <AuthScreen />
            )}
        </div>
    );
}

// --- Authentication Screen with Cloudflare Turnstile ---
function AuthScreen() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [turnstileToken, setTurnstileToken] = useState(null);
    const turnstileRef = useRef(null);

    // Dynamically load Cloudflare Turnstile script
    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);

        window.onloadTurnstileCallback = function () {
            if (turnstileRef.current) {
                window.turnstile.render(turnstileRef.current, {
                    sitekey: '1x00000000000000000000AA', // Replace with your actual site key. This is a test key.
                    callback: function(token) {
                        setTurnstileToken(token);
                    },
                    'expired-callback': function() {
                        setTurnstileToken(null);
                    },
                });
            }
        };

        return () => {
            document.body.removeChild(script);
            delete window.onloadTurnstileCallback;
        }
    }, []);


    const handleAuthAction = async (action) => {
        setError('');
        if (!turnstileToken) {
            setError('ကျေးဇူးပြု၍ သင်သည်လူဖြစ်ကြောင်း အတည်ပြုပါ။');
            return;
        }
        
        // IMPORTANT: In a real application, you would send the `turnstileToken` 
        // to your backend (e.g., a Firebase Cloud Function) to verify it with Cloudflare's API.
        // Since this is a client-side only example, we are only checking for its presence.

        try {
            await action();
        } catch (error) {
            setError(getFriendlyErrorMessage(error.code));
        }
    };

    const handleGoogleSignIn = () => {
        handleAuthAction(async () => {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        });
    };

    const handleEmailAuth = (e) => {
        e.preventDefault();
        const action = isLogin
            ? () => signInWithEmailAndPassword(auth, email, password)
            : () => createUserWithEmailAndPassword(auth, email, password);
        handleAuthAction(action);
    };
    
    const getFriendlyErrorMessage = (code) => {
        switch (code) {
            case 'auth/invalid-email': return 'Email လိပ်စာ မှားယွင်းနေပါသည်။';
            case 'auth/user-not-found': return 'ဤ Email ဖြင့် အကောင့်မရှိသေးပါ။';
            case 'auth/wrong-password': return 'စကားဝှက် မှားယွင်းနေပါသည်။';
            case 'auth/email-already-in-use': return 'ဤ Email ဖြင့် အကောင့်ဖွင့်ပြီးသားဖြစ်ပါသည်။';
            case 'auth/weak-password': return 'စကားဝှက် အနည်းဆုံး (၆) လုံး လိုအပ်ပါသည်။';
            case 'auth/operation-not-allowed': return 'Email/Password ဖြင့် အကောင့်ဝင်ခြင်းကို ခွင့်မပြုထားပါ။';
            default: return 'တစ်ခုခုမှားယွင်းနေပါသည်။ နောက်တစ်ကြိမ် ထပ်ကြိုးစားပါ။';
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl">
                <h2 className="text-3xl font-bold text-center text-gray-800">POS စနစ်မှ ကြိုဆိုပါသည်</h2>
                <p className="text-center text-gray-500">{isLogin ? 'အကောင့်ဝင်ပါ' : 'အကောင့်သစ်ဖွင့်ပါ'}</p>
                
                {error && <p className="text-red-500 text-center bg-red-100 p-3 rounded-lg">{error}</p>}

                <form onSubmit={handleEmailAuth} className="space-y-4">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email လိပ်စာ"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="စကားဝှက်"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                    />
                    
                    {/* Cloudflare Turnstile Widget */}
                    <div ref={turnstileRef} className="my-4 flex justify-center"></div>

                    <button 
                        type="submit" 
                        disabled={!turnstileToken}
                        className="w-full py-3 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <ShieldCheck size={20} />
                        {isLogin ? 'အကောင့်ဝင်ရန်' : 'အကောင့်သစ်ဖွင့်ရန်'}
                    </button>
                </form>

                <div className="flex items-center justify-center">
                    <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-sm text-indigo-600 hover:underline">
                        {isLogin ? 'အကောင့်သစ်ဖွင့်လိုပါသလား?' : 'အကောင့်ရှိပြီးသားလား?'}
                    </button>
                </div>

                <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="flex-shrink mx-4 text-gray-400">သို့မဟုတ်</span>
                    <div className="flex-grow border-t border-gray-300"></div>
                </div>

                <button 
                    onClick={handleGoogleSignIn} 
                    disabled={!turnstileToken}
                    className="w-full flex items-center justify-center py-3 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:bg-gray-200 disabled:cursor-not-allowed"
                >
                    <img src="https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png" alt="Google" className="w-6 h-6 mr-3" />
                    <span className="font-semibold text-gray-700">Google ဖြင့်ဝင်ရန်</span>
                </button>
            </div>
        </div>
    );
}


// --- Sidebar Navigation ---
function Sidebar({ activeTab, setActiveTab }) {
    const handleSignOut = () => {
        signOut(auth);
    };

    const navItems = [
        { id: 'pos', icon: ShoppingCart, label: 'အရောင်း' },
        { id: 'items', icon: Package, label: 'ပစ္စည်းစာရင်း' },
        { id: 'reports', icon: BarChart2, label: 'စာရင်းချုပ်' },
        { id: 'profile', icon: UserCircle, label: 'Profile' },
    ];

    return (
        <div className="bg-white md:w-64 p-4 border-r border-gray-200 flex md:flex-col justify-between">
            <div className="flex md:flex-col gap-2">
                 <h1 className="text-2xl font-bold text-indigo-600 mb-6 hidden md:block">POS System</h1>
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`flex items-center w-full p-3 rounded-lg text-left transition-colors ${
                            activeTab === item.id ? 'bg-indigo-100 text-indigo-600' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        <item.icon className="mr-3" size={20} />
                        <span className="font-medium">{item.label}</span>
                    </button>
                ))}
            </div>
            <button
                onClick={handleSignOut}
                className="flex items-center w-full p-3 rounded-lg text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors"
            >
                <LogOut className="mr-3" size={20} />
                <span className="font-medium">ထွက်ရန်</span>
            </button>
        </div>
    );
}

// --- Profile Component ---
function Profile({ user }) {
    const [profile, setProfile] = useState({ shopName: '', address: '', salesperson: '', photoURL: '' });
    const [imageFile, setImageFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (user) {
            const docRef = doc(db, 'users', user.uid);
            getDoc(docRef).then(docSnap => {
                if (docSnap.exists()) {
                    setProfile(docSnap.data());
                } else {
                    setProfile(p => ({
                        ...p,
                        salesperson: user.displayName || '',
                        photoURL: user.photoURL || ''
                    }));
                }
            });
        }
    }, [user]);

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setImageFile(e.target.files[0]);
            const reader = new FileReader();
            reader.onload = (event) => {
                setProfile(p => ({ ...p, photoURL: event.target.result }));
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) return;
        setIsLoading(true);
        setMessage('');

        try {
            let photoURL = profile.photoURL;
            if (imageFile) {
                const storageRef = ref(storage, `profiles/${user.uid}/${imageFile.name}`);
                const snapshot = await uploadBytes(storageRef, imageFile);
                photoURL = await getDownloadURL(snapshot.ref);
            }
            
            const profileData = { ...profile, photoURL };
            await setDoc(doc(db, 'users', user.uid), profileData, { merge: true });
            setProfile(profileData);
            setMessage('Profile ကို အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ။');
        } catch (error) {
            console.error("Error updating profile: ", error);
            setMessage('Profile သိမ်းဆည်းရာတွင် အမှားအယွင်းဖြစ်ပွားပါသည်။');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Profile အချက်အလက်များ</h2>
            {message && <p className="mb-4 p-3 rounded-lg bg-green-100 text-green-700">{message}</p>}
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center space-x-6">
                    <img
                        src={profile.photoURL || 'https://placehold.co/100x100/E2E8F0/A0AEC0?text=ပုံ'}
                        alt="Profile"
                        className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                    />
                    <label htmlFor="photo-upload" className="cursor-pointer bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition">
                        ပုံပြောင်းရန်
                        <input id="photo-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                    </label>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">ဆိုင်အမည်</label>
                    <input
                        type="text"
                        value={profile.shopName || ''}
                        onChange={(e) => setProfile({ ...profile, shopName: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">လိပ်စာ</label>
                    <input
                        type="text"
                        value={profile.address || ''}
                        onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">အရောင်းဝန်ထမ်းအမည်</label>
                    <input
                        type="text"
                        value={profile.salesperson || ''}
                        onChange={(e) => setProfile({ ...profile, salesperson: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
                >
                    {isLoading ? 'သိမ်းဆည်းနေသည်...' : 'သိမ်းဆည်းမည်'}
                </button>
            </form>
        </div>
    );
}

// --- Items Management Component ---
function Items({ user }) {
    const [items, setItems] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [newItem, setNewItem] = useState({ name: '', price: '' });
    const [editingItem, setEditingItem] = useState(null);

    useEffect(() => {
        if (user) {
            const q = query(collection(db, `users/${user.uid}/items`));
            getDocs(q).then(querySnapshot => {
                const itemsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setItems(itemsList);
            });
        }
    }, [user]);

    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!newItem.name || !newItem.price) return;
        
        const itemData = { name: newItem.name, price: parseFloat(newItem.price) };
        const docRef = await addDoc(collection(db, `users/${user.uid}/items`), itemData);
        setItems([...items, { id: docRef.id, ...itemData }]);
        setNewItem({ name: '', price: '' });
        setShowForm(false);
    };
    
    const handleUpdateItem = async (e) => {
        e.preventDefault();
        if (!editingItem) return;
        const itemRef = doc(db, `users/${user.uid}/items`, editingItem.id);
        const updatedData = { name: editingItem.name, price: parseFloat(editingItem.price) };
        await updateDoc(itemRef, updatedData);
        setItems(items.map(item => item.id === editingItem.id ? { ...item, ...updatedData } : item));
        setEditingItem(null);
    };

    const handleDeleteItem = async (itemId) => {
        if (window.confirm('ဤပစ္စည်းကို ဖျက်ရန် သေချာပါသလား?')) {
            await deleteDoc(doc(db, `users/${user.uid}/items`, itemId));
            setItems(items.filter(item => item.id !== itemId));
        }
    };

    const startEditing = (item) => {
        setEditingItem({ ...item });
        setShowForm(false);
    };

    const cancelEditing = () => {
        setEditingItem(null);
    };

    const ItemForm = ({ item, setItem, handleSubmit, buttonText, onCancel }) => (
        <form onSubmit={handleSubmit} className="p-4 bg-gray-100 rounded-lg mt-4 space-y-3">
            <input
                type="text"
                placeholder="ပစ္စည်းအမည်"
                value={item.name}
                onChange={(e) => setItem({ ...item, name: e.target.value })}
                className="w-full p-2 border rounded"
                required
            />
            <input
                type="number"
                placeholder="ဈေးနှုန်း"
                value={item.price}
                onChange={(e) => setItem({ ...item, price: e.target.value })}
                className="w-full p-2 border rounded"
                required
            />
            <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-indigo-500 text-white p-2 rounded hover:bg-indigo-600 flex items-center justify-center gap-2"><Save size={16}/> {buttonText}</button>
                {onCancel && <button type="button" onClick={onCancel} className="flex-1 bg-gray-500 text-white p-2 rounded hover:bg-gray-600 flex items-center justify-center gap-2"><XCircle size={16}/> ပယ်ဖျက်မည်</button>}
            </div>
        </form>
    );

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">ပစ္စည်းစာရင်း</h2>
                {!showForm && !editingItem && (
                    <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
                        <PlusCircle size={20} /> အသစ်ထည့်ရန်
                    </button>
                )}
            </div>

            {showForm && <ItemForm item={newItem} setItem={setNewItem} handleSubmit={handleAddItem} buttonText="ထည့်မည်" onCancel={() => setShowForm(false)} />}
            {editingItem && <ItemForm item={editingItem} setItem={setEditingItem} handleSubmit={handleUpdateItem} buttonText="ပြင်ဆင်မည်" onCancel={cancelEditing} />}

            <div className="bg-white p-4 rounded-xl shadow-md mt-6">
                <ul className="space-y-3">
                    {items.sort((a, b) => a.name.localeCompare(b.name)).map(item => (
                        <li key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                                <p className="font-semibold text-gray-800">{item.name}</p>
                                <p className="text-sm text-gray-600">{item.price.toLocaleString()} Ks</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => startEditing(item)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-full"><Edit size={18} /></button>
                                <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><Trash2 size={18} /></button>
                            </div>
                        </li>
                    ))}
                </ul>
                {items.length === 0 && <p className="text-center text-gray-500 py-8">ပစ္စည်းများမရှိသေးပါ။</p>}
            </div>
        </div>
    );
}

// --- POS Component ---
function POS({ user, setActiveTab }) {
    const [items, setItems] = useState([]);
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [profile, setProfile] = useState(null);
    const [lastReceipt, setLastReceipt] = useState(null);

    useEffect(() => {
        if (user) {
            const q = query(collection(db, `users/${user.uid}/items`));
            getDocs(q).then(querySnapshot => {
                const itemsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setItems(itemsList);
            });
            getDoc(doc(db, 'users', user.uid)).then(docSnap => {
                if (docSnap.exists()) setProfile(docSnap.data());
            });
        }
    }, [user]);

    const addToCart = (item) => {
        setCart(currentCart => {
            const existingItem = currentCart.find(cartItem => cartItem.id === item.id);
            if (existingItem) {
                return currentCart.map(cartItem =>
                    cartItem.id === item.id ? { ...cartItem, qty: cartItem.qty + 1 } : cartItem
                );
            }
            return [...currentCart, { ...item, qty: 1 }];
        });
    };

    const updateQty = (itemId, newQty) => {
        if (newQty < 1) {
            setCart(cart.filter(item => item.id !== itemId));
        } else {
            setCart(cart.map(item => item.id === itemId ? { ...item, qty: newQty } : item));
        }
    };

    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        if (!profile || !profile.shopName) {
            alert('ကျေးဇူးပြု၍ Profile တွင် ဆိုင်အမည်ကို ဦးစွာဖြည့်သွင်းပါ။');
            setActiveTab('profile');
            return;
        }

        const saleData = {
            items: cart,
            total,
            timestamp: new Date(),
            profile: {
                shopName: profile.shopName,
                address: profile.address,
                salesperson: profile.salesperson
            }
        };

        try {
            await addDoc(collection(db, `users/${user.uid}/sales`), saleData);
            setLastReceipt(saleData);
            setCart([]);
        } catch (error) {
            console.error("Error on checkout: ", error);
            alert('ငွေရှင်းရာတွင် အမှားအယွင်းဖြစ်ပွားပါသည်။');
        }
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (lastReceipt) {
        return <Receipt receipt={lastReceipt} onBack={() => setLastReceipt(null)} />;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">ပစ္စည်းများရွေးချယ်ရန်</h2>
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="ပစ္စည်းအမည်ဖြင့်ရှာရန်..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 pl-10 border rounded-lg"
                    />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredItems.sort((a, b) => a.name.localeCompare(b.name)).map(item => (
                        <button key={item.id} onClick={() => addToCart(item)} className="bg-white p-4 rounded-lg shadow hover:shadow-lg hover:border-indigo-500 border transition text-center">
                            <p className="font-semibold text-gray-700 truncate">{item.name}</p>
                            <p className="text-indigo-600">{item.price.toLocaleString()} Ks</p>
                        </button>
                    ))}
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-bold text-gray-800 mb-4">ဝယ်ယူရန်စာရင်း</h2>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {cart.map(item => (
                        <div key={item.id} className="flex justify-between items-center">
                            <div>
                                <p className="font-medium">{item.name}</p>
                                <p className="text-sm text-gray-500">{item.price.toLocaleString()} Ks</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-6 h-6 bg-gray-200 rounded-full">-</button>
                                <span>{item.qty}</span>
                                <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-6 h-6 bg-gray-200 rounded-full">+</button>
                            </div>
                        </div>
                    ))}
                </div>
                {cart.length === 0 && <p className="text-center text-gray-400 py-8">ပစ္စည်းမရွေးရသေးပါ။</p>}
                <div className="border-t mt-4 pt-4">
                    <div className="flex justify-between font-bold text-lg">
                        <span>စုစုပေါင်း</span>
                        <span>{total.toLocaleString()} Ks</span>
                    </div>
                    <button
                        onClick={handleCheckout}
                        disabled={cart.length === 0}
                        className="w-full mt-4 bg-indigo-600 text-white p-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-indigo-300"
                    >
                        ငွေရှင်းမည်
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- Reports Component ---
function Reports({ user }) {
    const [sales, setSales] = useState([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [totalRevenue, setTotalRevenue] = useState(0);

    const fetchSales = async () => {
        if (!user || !startDate || !endDate) {
            alert("ကျေးဇူးပြု၍ စတင်မည့်ရက်နှင့် ပြီးဆုံးမည့်ရက်ကို ရွေးချယ်ပါ။");
            return;
        }

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const salesRef = collection(db, `users/${user.uid}/sales`);
        const q = query(salesRef, where("timestamp", ">=", start), where("timestamp", "<=", end));

        const querySnapshot = await getDocs(q);
        const salesData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp.toDate()
        })).sort((a, b) => b.timestamp - a.timestamp);

        setSales(salesData);
        const revenue = salesData.reduce((sum, sale) => sum + sale.total, 0);
        setTotalRevenue(revenue);
    };
    
    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">အရောင်းစာရင်းချုပ်</h2>
            <div className="bg-white p-4 rounded-xl shadow-md mb-6 flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 w-full">
                    <label className="text-sm font-medium">စတင်သည့်ရက်</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded-lg mt-1" />
                </div>
                <div className="flex-1 w-full">
                    <label className="text-sm font-medium">ပြီးဆုံးသည့်ရက်</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border rounded-lg mt-1" />
                </div>
                <button onClick={fetchSales} className="w-full md:w-auto bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2">
                    <Search size={18} /> ကြည့်ရှုရန်
                </button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex justify-between items-center mb-4 pb-4 border-b">
                    <h3 className="text-lg font-semibold">ရလဒ်များ</h3>
                    <div className="text-right">
                        <p className="text-gray-600">စုစုပေါင်းဝင်ငွေ</p>
                        <p className="text-2xl font-bold text-indigo-600">{totalRevenue.toLocaleString()} Ks</p>
                    </div>
                </div>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    {sales.map(sale => (
                        <div key={sale.id} className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold">{sale.timestamp.toLocaleString('en-GB')}</p>
                                    <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                                        {sale.items.map(item => (
                                            <li key={item.id}>{item.name} (x{item.qty})</li>
                                        ))}
                                    </ul>
                                </div>
                                <p className="font-semibold text-lg">{sale.total.toLocaleString()} Ks</p>
                            </div>
                        </div>
                    ))}
                    {sales.length === 0 && <p className="text-center text-gray-500 py-8">ဤရက်အပိုင်းအခြားအတွင်း အရောင်းမရှိပါ။</p>}
                </div>
            </div>
        </div>
    );
}

// --- Receipt Component ---
function Receipt({ receipt, onBack }) {
    const receiptRef = useRef();

    const handlePrint = () => {
        const printContent = receiptRef.current.innerHTML;
        const originalContent = document.body.innerHTML;
        const styles = Array.from(document.styleSheets)
            .map(styleSheet => {
                try {
                    return Array.from(styleSheet.cssRules)
                        .map(rule => rule.cssText)
                        .join('');
                } catch (e) {
                    console.log('Could not read stylesheet rules:', e);
                    return '';
                }
            }).join('\n');

        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write('<html><head><title>Print Receipt</title>');
        printWindow.document.write('<style>');
        printWindow.document.write(styles);
        printWindow.document.write('</style></head><body>');
        printWindow.document.write(printContent);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); }, 500);
    };
    
    const ReceiptContent = () => (
        <div className="bg-white p-6 font-mono text-sm text-black max-w-sm mx-auto border-2 border-dashed border-black">
            <div className="text-center mb-4">
                <h3 className="text-xl font-bold">{receipt.profile.shopName}</h3>
                <p>{receipt.profile.address}</p>
            </div>
            <div className="border-t border-b border-dashed border-black my-2 py-1">
                <p>ရက်စွဲ: {new Date(receipt.timestamp).toLocaleString('en-GB')}</p>
                <p>အရောင်းဝန်ထမ်း: {receipt.profile.salesperson}</p>
            </div>
            <table className="w-full">
                <thead>
                    <tr>
                        <th className="text-left py-1">ပစ္စည်း</th>
                        <th className="text-center">အရေအတွက်</th>
                        <th className="text-right">ကျသင့်ငွေ</th>
                    </tr>
                </thead>
                <tbody>
                    {receipt.items.map(item => (
                        <tr key={item.id} className="border-b border-dotted border-black">
                            <td className="py-1">{item.name}</td>
                            <td className="text-center">{item.qty}</td>
                            <td className="text-right">{(item.price * item.qty).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="mt-4 text-right">
                <p className="font-bold text-lg">စုစုပေါင်း: {receipt.total.toLocaleString()} Ks</p>
            </div>
            <p className="text-center mt-4 text-xs">*** ဝယ်ယူအားပေးမှုအတွက် ကျေးဇူးတင်ပါသည် ***</p>
        </div>
    );

    return (
        <div className="max-w-md mx-auto">
            <div className="flex justify-between items-center mb-4">
                <button onClick={onBack} className="flex items-center gap-2 text-indigo-600 hover:underline">
                    <ArrowLeft size={20} /> နောက်သို့
                </button>
                <button onClick={handlePrint} className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">
                    <Printer size={20} /> Save/Print ဘောင်ချာ
                </button>
            </div>
            <div ref={receiptRef}>
                <ReceiptContent />
            </div>
        </div>
    );
}


