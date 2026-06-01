/**
 * PropertyCalculator
 *
 * Java representation of the core financial formulas used in the
 * OwnIt Property Calculator (assets/js/calculator.js).
 */
public class PropertyCalculator {

    /**
     * Calculates the fixed monthly mortgage payment using the standard
     * amortization formula (mirrors calculatePayment() in calculator.js).
     *
     * @param loanAmount         principal loan amount in dollars
     * @param termMonths         total number of monthly payments
     * @param annualInterestRate annual interest rate as a percentage (e.g. 6.0 for 6%)
     * @return monthly payment rounded to 2 decimal places, or 0 if invalid input
     */
    public double calculateMonthlyMortgagePayment(double loanAmount,
                                                   int termMonths,
                                                   double annualInterestRate) {
        if (loanAmount <= 0 || termMonths <= 0) {
            return 0;
        }

        // Zero-interest case: spread principal evenly
        if (annualInterestRate == 0) {
            double result = loanAmount / termMonths;
            return Math.round(result * 100.0) / 100.0;
        }

        double i = (annualInterestRate / 100.0) / 12.0;       // monthly rate
        double iToM = Math.pow(1 + i, termMonths);             // (1+i)^n
        double payment = loanAmount * (i * iToM) / (iToM - 1);
        return Math.round(payment * 100.0) / 100.0;
    }

    /**
     * Calculates annual cash flow for a rental property.
     *
     * Formula (mirrors calculator.js):
     *   effectiveMonthlyIncome = monthlyRent * (1 - (vacancyRate + managementFee) / 100)
     *   annualCashFlow = effectiveMonthlyIncome * 12 - annualExpenses - annualMortgagePayment
     *
     * @param monthlyRent          gross monthly rental income in dollars
     * @param vacancyRatePct       vacancy rate as a percentage (e.g. 5.0 for 5%)
     * @param managementFeePct     property management fee as a percentage (e.g. 8.0 for 8%)
     * @param annualExpenses       total annual expenses (taxes + insurance + HOA + maintenance)
     * @param annualMortgagePayment total annual mortgage payments (0 if no loan)
     * @return annual cash flow in dollars (negative means a loss)
     */
    public double calculateAnnualCashFlow(double monthlyRent,
                                          double vacancyRatePct,
                                          double managementFeePct,
                                          double annualExpenses,
                                          double annualMortgagePayment) {
        double deductionRate = (vacancyRatePct + managementFeePct) / 100.0;
        double effectiveMonthlyIncome = monthlyRent * (1 - deductionRate);
        double annualIncome = effectiveMonthlyIncome * 12.0;
        return annualIncome - annualExpenses - annualMortgagePayment;
    }
}
