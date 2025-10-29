// Script para debuggear el problema de categorías vacías
const organizationId = '5bb37719-a5a5-440a-b5a4-a98ffb533201';

async function testTopCategoriesAPI() {
  try {
    console.log('🔍 Probando API de top-categories...');
    
    const url = `http://localhost:3001/api/metrics/top-categories?organizationId=${organizationId}`;
    console.log('URL:', url);
    
    const response = await fetch(url);
    console.log('Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ Respuesta exitosa:');
    console.log('- Data length:', data.data?.length || 0);
    console.log('- Total expenses:', data.totalExpenses);
    console.log('- Categories:', JSON.stringify(data.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// También probar la API de transacciones para ver si hay datos
async function testTransactionsAPI() {
  try {
    console.log('\n🔍 Probando API de transacciones...');
    
    const url = `http://localhost:3001/api/transactions?organization_id=${organizationId}&type=expense&limit=5`;
    console.log('URL:', url);
    
    const response = await fetch(url);
    console.log('Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ Respuesta exitosa:');
    console.log('- Transactions length:', data.length || 0);
    console.log('- First few transactions:', JSON.stringify(data.slice(0, 3), null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Ejecutar ambas pruebas
async function runTests() {
  await testTopCategoriesAPI();
  await testTransactionsAPI();
}

runTests();