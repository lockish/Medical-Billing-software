import { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import NewBill from './pages/NewBill';
import SalesReturn from './pages/SalesReturn';
import SalesHistory from './pages/SalesHistory';
import NewPurchase from './pages/NewPurchase';
import PurchaseHistory from './pages/PurchaseHistory';
import Medicines from './pages/Medicines';
import Customers from './pages/Customers';
import Doctors from './pages/Doctors';
import Suppliers from './pages/Suppliers';
import Reports from './pages/Reports';
import { Page } from './types';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard onNavigate={setCurrentPage} />;
      case 'new-bill': return <NewBill />;
      case 'sales-return': return <SalesReturn />;
      case 'sales-history': return <SalesHistory />;
      case 'new-purchase': return <NewPurchase />;
      case 'purchase-history': return <PurchaseHistory />;
      case 'medicines': return <Medicines />;
      case 'customers': return <Customers />;
      case 'doctors': return <Doctors />;
      case 'suppliers': return <Suppliers />;
      case 'reports': return <Reports />;
      default: return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export default App;
