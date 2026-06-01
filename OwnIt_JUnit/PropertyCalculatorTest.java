import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

/**
 * JUnit 5 tests for PropertyCalculator.
 *
 * Two scenarios related to the OwnIt Property Calculator project:
 *   1. Monthly mortgage payment calculation
 *   2. Annual rental cash flow calculation
 */
public class PropertyCalculatorTest {

    private final PropertyCalculator calc = new PropertyCalculator();

    // ----------------------------------------------------------------
    // Scenario 1: Monthly Mortgage Payment
    //
    // A buyer purchases a $200,000 property with 20% down ($40,000),
    // financing $160,000 at 6% annual interest over 30 years (360 months).
    // The expected fixed monthly payment is $959.28.
    //
    // This mirrors the core formula in calculator.js:
    //   loanValue = price - price * downPayment / 100
    //   mortgagePayment = calculatePayment(loanValue, years * 12, interest)
    // ----------------------------------------------------------------

    @Test
    void mortgagePaymentCalculatedCorrectlyForStandardLoan() {
        double purchasePrice   = 200_000.0;
        double downPaymentPct  = 20.0;           // 20%
        double annualRate      = 6.0;            // 6%
        int    termMonths      = 30 * 12;        // 360

        double loanAmount = purchasePrice - purchasePrice * downPaymentPct / 100.0;  // $160,000

        double monthlyPayment = calc.calculateMonthlyMortgagePayment(loanAmount, termMonths, annualRate);

        // Standard amortization result for $160,000 at 6% / 30 yrs = $959.28
        assertEquals(959.28, monthlyPayment, 0.01,
            "Monthly mortgage payment should be approximately $959.28");
    }

    // ----------------------------------------------------------------
    // Scenario 2: Annual Rental Cash Flow
    //
    // A property is rented at $2,000/month.
    // Vacancy rate: 5%, management fee: 8% (total deduction: 13%)
    //   Effective monthly income = $2,000 * (1 - 0.13) = $1,740
    //   Annual income            = $1,740 * 12          = $20,880
    // Annual expenses (taxes + insurance + maintenance): $4,200
    // No mortgage (paid with cash).
    //   Annual cash flow = $20,880 - $4,200 - $0       = $16,680
    //
    // This mirrors the cash flow section of calculator.js.
    // ----------------------------------------------------------------

    @Test
    void annualCashFlowCalculatedCorrectlyForCashPurchase() {
        double monthlyRent      = 2_000.0;
        double vacancyRate      = 5.0;   // 5%
        double managementFee    = 8.0;   // 8%
        double annualExpenses   = 4_200.0;
        double annualMortgage   = 0.0;   // cash purchase — no loan

        double cashFlow = calc.calculateAnnualCashFlow(
            monthlyRent, vacancyRate, managementFee, annualExpenses, annualMortgage);

        assertEquals(16_680.0, cashFlow, 0.01,
            "Annual cash flow should be $16,680 for a cash-purchase rental property");
    }
}
