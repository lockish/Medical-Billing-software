import { Sale, SaleItem } from '../types';
import { formatCurrency, formatDate } from '../lib/codeGenerator';

interface InvoicePrintProps {
  sale: Sale & { sale_items: SaleItem[] };
}

export default function InvoicePrint({ sale }: InvoicePrintProps) {
  const amountInWords = (amount: number): string => {
    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const convert = (n: number): string => {
      if (n < 10) return units[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + units[n % 10] : '');
      if (n < 1000) return units[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
      if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
      if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
      return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
    };
    const rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);
    let words = convert(rupees) + ' Rupees';
    if (paise > 0) words += ' and ' + convert(paise) + ' Paise';
    return words + ' Only';
  };

  return (
    <div className="invoice-print bg-white" style={{ width: '210mm', minHeight: '297mm', padding: '10mm', fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#000' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid #1e40af', paddingBottom: '8px', marginBottom: '8px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#1e40af', margin: 0 }}>OBITO MEDICALS</h1>
        <p style={{ margin: '2px 0', fontSize: '10px', color: '#555' }}>Your Health, Our Care</p>
        <p style={{ margin: '2px 0', fontSize: '10px' }}>No. 12, Main Road, Coimbatore - 641001 | Ph: +91 98765 43210</p>
        <p style={{ margin: '2px 0', fontSize: '10px' }}>GSTIN: 33AAAOB1234A1Z5 | Drug Lic: TN-CB-001234</p>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <span style={{ fontWeight: 'bold', fontSize: '13px', borderBottom: '1px solid #000', paddingBottom: '2px' }}>
          {sale.is_return ? 'CREDIT NOTE / RETURN' : 'RETAIL INVOICE'}
        </span>
      </div>

      {/* Bill Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', gap: '8px' }}>
        <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '6px', flex: 1 }}>
          <p style={{ margin: '2px 0' }}><strong>Bill No:</strong> {sale.bill_no}</p>
          <p style={{ margin: '2px 0' }}><strong>Date:</strong> {new Date(sale.bill_date).toLocaleString('en-IN')}</p>
          <p style={{ margin: '2px 0' }}><strong>Type:</strong> {sale.delivery_type === 'delivery' ? 'Home Delivery' : 'Store Purchase'}</p>
          {sale.sales_rep && <p style={{ margin: '2px 0' }}><strong>Sales Rep:</strong> {sale.sales_rep}</p>}
        </div>
        <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '6px', flex: 1 }}>
          <p style={{ margin: '2px 0', fontWeight: 'bold', color: '#1e40af' }}>Customer:</p>
          {sale.customer_code && <p style={{ margin: '2px 0' }}><strong>Code:</strong> {sale.customer_code}</p>}
          <p style={{ margin: '2px 0' }}>{sale.customer_name || 'Walk-in Customer'}</p>
          {sale.customer_mobile && <p style={{ margin: '2px 0' }}>Ph: {sale.customer_mobile}</p>}
          {sale.customer_address && <p style={{ margin: '2px 0' }}>{sale.customer_address}</p>}
        </div>
        {(sale.doctor_name) && (
          <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '6px', flex: 1 }}>
            <p style={{ margin: '2px 0', fontWeight: 'bold', color: '#1e40af' }}>Doctor:</p>
            <p style={{ margin: '2px 0' }}>{sale.doctor_name}</p>
            {sale.doctor_address && <p style={{ margin: '2px 0' }}>{sale.doctor_address}</p>}
          </div>
        )}
      </div>

      {/* Items Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px', fontSize: '10px' }}>
        <thead>
          <tr style={{ backgroundColor: '#1e40af', color: 'white' }}>
            <th style={{ padding: '5px', textAlign: 'left', border: '1px solid #1e40af' }}>#</th>
            <th style={{ padding: '5px', textAlign: 'left', border: '1px solid #1e40af' }}>Product</th>
            <th style={{ padding: '5px', textAlign: 'left', border: '1px solid #1e40af' }}>Batch</th>
            <th style={{ padding: '5px', textAlign: 'left', border: '1px solid #1e40af' }}>Expiry</th>
            <th style={{ padding: '5px', textAlign: 'right', border: '1px solid #1e40af' }}>Qty</th>
            <th style={{ padding: '5px', textAlign: 'right', border: '1px solid #1e40af' }}>Free</th>
            <th style={{ padding: '5px', textAlign: 'right', border: '1px solid #1e40af' }}>Rate</th>
            <th style={{ padding: '5px', textAlign: 'right', border: '1px solid #1e40af' }}>Disc%</th>
            <th style={{ padding: '5px', textAlign: 'right', border: '1px solid #1e40af' }}>Disc Amt</th>
            <th style={{ padding: '5px', textAlign: 'right', border: '1px solid #1e40af' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {sale.sale_items.map((item, i) => (
            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#f8faff' : 'white' }}>
              <td style={{ padding: '4px 5px', border: '1px solid #e5e7eb' }}>{i + 1}</td>
              <td style={{ padding: '4px 5px', border: '1px solid #e5e7eb' }}>
                <div>{item.medicine_name}</div>
                <div style={{ fontSize: '9px', color: '#666' }}>
                  {item.product_code && `${item.product_code} `}
                  {item.schedule && `#${item.schedule}`}
                </div>
              </td>
              <td style={{ padding: '4px 5px', border: '1px solid #e5e7eb' }}>{item.batch_no || '-'}</td>
              <td style={{ padding: '4px 5px', border: '1px solid #e5e7eb' }}>{formatDate(item.expiry_date)}</td>
              <td style={{ padding: '4px 5px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{item.quantity}</td>
              <td style={{ padding: '4px 5px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{item.free_qty || 0}</td>
              <td style={{ padding: '4px 5px', border: '1px solid #e5e7eb', textAlign: 'right' }}>₹{item.rate_per_unit.toFixed(2)}</td>
              <td style={{ padding: '4px 5px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{item.discount_pct || 0}%</td>
              <td style={{ padding: '4px 5px', border: '1px solid #e5e7eb', textAlign: 'right' }}>₹{formatCurrency(item.discount_amt)}</td>
              <td style={{ padding: '4px 5px', border: '1px solid #e5e7eb', textAlign: 'right', fontWeight: 'bold' }}>₹{formatCurrency(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
        <table style={{ width: '220px', fontSize: '11px' }}>
          <tbody>
            <tr><td style={{ padding: '2px 8px' }}>Subtotal:</td><td style={{ textAlign: 'right', padding: '2px 8px' }}>₹{formatCurrency(sale.subtotal)}</td></tr>
            {sale.total_discount > 0 && <tr><td style={{ padding: '2px 8px' }}>Total Discount:</td><td style={{ textAlign: 'right', padding: '2px 8px', color: '#dc2626' }}>- ₹{formatCurrency(sale.total_discount)}</td></tr>}
            {sale.sgst > 0 && <tr><td style={{ padding: '2px 8px' }}>SGST:</td><td style={{ textAlign: 'right', padding: '2px 8px' }}>₹{formatCurrency(sale.sgst)}</td></tr>}
            {sale.cgst > 0 && <tr><td style={{ padding: '2px 8px' }}>CGST:</td><td style={{ textAlign: 'right', padding: '2px 8px' }}>₹{formatCurrency(sale.cgst)}</td></tr>}
            {sale.cess > 0 && <tr><td style={{ padding: '2px 8px' }}>CESS:</td><td style={{ textAlign: 'right', padding: '2px 8px' }}>₹{formatCurrency(sale.cess)}</td></tr>}
            <tr style={{ borderTop: '2px solid #1e40af', backgroundColor: '#eff6ff' }}>
              <td style={{ padding: '4px 8px', fontWeight: 'bold', fontSize: '13px', color: '#1e40af' }}>Grand Total:</td>
              <td style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 'bold', fontSize: '13px', color: '#1e40af' }}>₹{formatCurrency(sale.grand_total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Amount in words */}
      <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '6px', marginBottom: '12px', backgroundColor: '#f8faff' }}>
        <strong>Amount in Words: </strong>{amountInWords(sale.grand_total)}
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #ddd', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: '0', fontSize: '10px', color: '#666' }}>Goods once sold will not be taken back</p>
          <p style={{ margin: '2px 0 0 0', fontWeight: 'bold', color: '#1e40af' }}>Thank You! Visit Again.</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ borderTop: '1px solid #000', width: '120px', marginBottom: '4px' }}></div>
          <p style={{ margin: 0, fontSize: '10px' }}>Authorised Signatory</p>
        </div>
      </div>
    </div>
  );
}
