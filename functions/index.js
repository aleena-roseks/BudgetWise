const functions = require('firebase-functions');
const admin = require('firebase-admin');
const XLSX = require('xlsx');

admin.initializeApp();

exports.exportUserBudgetSheet = functions.https.onCall(async (data, context) => {
  const email = (data && data.email ? String(data.email) : context && context.auth && context.auth.token && context.auth.token.email ? String(context.auth.token.email) : '').trim().toLowerCase();

  if (!email) {
    throw new functions.https.HttpsError('failed-precondition', 'A valid email is required.');
  }

  const userRef = admin.firestore().collection('users').doc(email);
  const userDoc = await userRef.get();

  const profile = userDoc.exists ? userDoc.data() : { budgets: [], expenses: [] };
  const budgets = Array.isArray(profile.budgets) ? profile.budgets : [];
  const expenses = Array.isArray(profile.expenses) ? profile.expenses : [];

  const workbook = XLSX.utils.book_new();

  const budgetsSheet = budgets.map((budget) => ({
    Category: budget.name,
    Limit: Number(budget.limit || 0),
    Color: budget.color || '#4f46e5'
  }));

  const expensesSheet = expenses.map((expense) => {
    const category = budgets.find((budget) => budget.id === expense.categoryId);
    return {
      Email: email,
      Date: expense.date,
      Category: category ? category.name : 'Unknown',
      Amount: Number(expense.amount || 0),
      Note: expense.note || ''
    };
  });

  const summarySheet = [{
    Email: email,
    TotalBudget: budgets.reduce((sum, budget) => sum + Number(budget.limit || 0), 0),
    TotalSpent: expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    Remaining: budgets.reduce((sum, budget) => sum + Number(budget.limit || 0), 0) - expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
  }];

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(budgetsSheet), 'Budgets');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(expensesSheet), 'Expenses');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summarySheet), 'Summary');

  const fileName = `${email.replace(/[^a-z0-9]/gi, '_')}-budgetwise.xlsx`;
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const storageFile = admin.storage().bucket().file(`exports/${fileName}`);

  await storageFile.save(buffer, { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', public: false });

  const [url] = await storageFile.getSignedUrl({
    action: 'read',
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7
  });

  return {
    email,
    fileName,
    downloadUrl: url,
    summary: summarySheet[0]
  };
});
