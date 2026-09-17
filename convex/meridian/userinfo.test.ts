import assert from "node:assert/strict";
import test from "node:test";
import { readMeridianStaffStatus } from "./userinfo";

test("readMeridianStaffStatus uses isMeridianStaff from userinfo", () => {
  assert.equal(readMeridianStaffStatus({ isMeridianStaff: true }), true);
  assert.equal(readMeridianStaffStatus({ isMeridianStaff: false }), false);
  assert.equal(readMeridianStaffStatus({}), false);
});

test("readMeridianStaffStatus accepts staff.meridianStaff from user.staff.read", () => {
  assert.equal(
    readMeridianStaffStatus({ staff: { meridianStaff: true } }),
    true,
  );
});
