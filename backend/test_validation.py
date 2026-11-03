
from app.services import validate_vendor


# =====================================================
# COMMON VALID VENDOR DATA
# =====================================================

clean_vendor = {
    "vendor_name": "BrightTech Solutions",
    "email": "accounts@brighttech.example",
    "country": "India",
    "tax_id": "36ABCDE1234F1Z9",
    "bank_account_name": "BrightTech Solutions"
}


# =====================================================
# TEST 1: CLEAN VENDOR
# =====================================================

print("\n========== TEST 1: CLEAN VENDOR ==========")

result = validate_vendor(
    clean_vendor,
    set()
)

print(result)

assert result["status"] == "APPROVED"
assert result["risk_score"] == 0
assert result["risk_category"] == "LOW"

print("TEST 1 PASSED")


# =====================================================
# TEST 2: MISSING TAX ID
# =====================================================

print("\n========== TEST 2: MISSING TAX ID ==========")

missing_tax = clean_vendor.copy()
missing_tax["tax_id"] = ""

result = validate_vendor(
    missing_tax,
    set()
)

print(result)

assert result["status"] == "PENDING"
assert result["risk_score"] == 30
assert result["risk_category"] == "MEDIUM"

print("TEST 2 PASSED")


# =====================================================
# TEST 3: DUPLICATE TAX ID
# =====================================================

print("\n========== TEST 3: DUPLICATE TAX ID ==========")

result = validate_vendor(
    clean_vendor,
    {"36ABCDE1234F1Z9"}
)

print(result)

assert result["status"] == "REJECTED"
assert result["risk_score"] == 70
assert result["risk_category"] == "HIGH"

print("TEST 3 PASSED")


# =====================================================
# TEST 4: BANK ACCOUNT NAME MISMATCH
# =====================================================

print("\n========== TEST 4: BANK NAME MISMATCH ==========")

wrong_bank = clean_vendor.copy()

wrong_bank["bank_account_name"] = "Different Company"

result = validate_vendor(
    wrong_bank,
    set()
)

print(result)

assert result["status"] == "PENDING"
assert result["risk_score"] == 40
assert result["risk_category"] == "MEDIUM"

print("TEST 4 PASSED")


# =====================================================
# TEST 5: INVALID EMAIL
# =====================================================

print("\n========== TEST 5: INVALID EMAIL ==========")

wrong_email = clean_vendor.copy()

wrong_email["email"] = "invalid-email"

result = validate_vendor(
    wrong_email,
    set()
)

print(result)

assert result["status"] == "PENDING"
assert result["risk_score"] == 15
assert result["risk_category"] == "LOW"

print("TEST 5 PASSED")


# =====================================================
# TEST 6: AI DOCUMENT MISMATCH
# =====================================================

print("\n========== TEST 6: AI DOCUMENT MISMATCH ==========")

extracted_data = {
    "vendor_name": "Another Company",
    "email": "different@example.com",
    "tax_id": "29ABCDE1234F1Z5",
    "bank_account_name": "Another Company"
}

result = validate_vendor(
    clean_vendor,
    set(),
    extracted_data
)

print(result)

assert result["status"] == "PENDING"
assert result["risk_score"] == 100
assert result["risk_category"] == "HIGH"

print("TEST 6 PASSED")


# =====================================================
# FINAL TEST SUMMARY
# =====================================================

print("\n========================================")
print("ALL 6 VENDOR VALIDATION TESTS PASSED!")
print("========================================")
