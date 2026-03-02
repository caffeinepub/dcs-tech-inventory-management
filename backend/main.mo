import Time "mo:core/Time";
import Order "mo:core/Order";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Float "mo:core/Float";
import Array "mo:core/Array";
import List "mo:core/List";
import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import UserApproval "user-approval/approval";

actor {
  let accessControlState = AccessControl.initState();
  let approvalState = UserApproval.initState(accessControlState);
  include MixinAuthorization(accessControlState);

  type UserStatus = {
    #pending;
    #approved;
    #rejected;
  };

  type AppRole = {
    #admin;
    #staff;
    #guest;
  };

  type UserProfile = {
    principal : Principal;
    email : Text;
    name : Text;
    role : AppRole;
    status : UserStatus;
    createdAt : Int;
    lastLoginAt : Int;
  };

  type InventoryItem = {
    id : Nat;
    name : Text;
    sku : Text;
    category : Text;
    quantity : Nat;
    unit : Text;
    lowStockThreshold : Nat;
    description : Text;
    createdAt : Int;
    updatedAt : Int;
    price : Float;
    supplier : Text;
    expirationDate : ?Int;
    barcode : Text;
  };

  type AdjustmentLog = {
    id : Nat;
    itemId : Nat;
    itemName : Text;
    adjustedBy : Principal;
    adjustedByEmail : Text;
    adjustmentType : { #add; #remove };
    amount : Nat;
    newQuantity : Nat;
    notes : Text;
    timestamp : Int;
  };

  type BulkInventoryRecord = {
    partNumber : Nat;
    partName : Text;
    description : Text;
    quantity : Nat;
    stockThreshold : Nat;
    category : Text;
    location : Text;
  };

  type BulkImportError = {
    rowIndex : Nat;
    reason : Text;
    record : BulkInventoryRecord;
  };

  type BulkImportResult = {
    createdCount : Nat;
    updatedCount : Nat;
    skippedCount : Nat;
    skippedRows : [BulkImportError];
    newRecordCount : Nat;
    newRecords : [BulkInventoryRecord];
  };

  let userMap = Map.empty<Principal, UserProfile>();
  let inventoryMap = Map.empty<Nat, InventoryItem>();
  let adjustmentList = List.empty<AdjustmentLog>();
  var nextItemId : Nat = 1;
  var nextLogId : Nat = 1;

  func appRoleToACRole(r : AppRole) : AccessControl.UserRole {
    switch r {
      case (#admin) #admin;
      case (#staff) #user;
      case (#guest) #guest;
    };
  };

  func acRoleToAppRole(r : AccessControl.UserRole) : AppRole {
    switch r {
      case (#admin) #admin;
      case (#user) #staff;
      case (#guest) #guest;
    };
  };

  func isApprovedUser(p : Principal) : Bool {
    switch (userMap.get(p)) {
      case (?u) { u.status == #approved };
      case (null) { false };
    };
  };

  func isStaffOrAdmin(p : Principal) : Bool {
    AccessControl.hasPermission(accessControlState, p, #user);
  };

  func compareByCreatedAt(i1 : InventoryItem, i2 : InventoryItem) : Order.Order {
    Int.compare(i1.createdAt, i2.createdAt);
  };

  public query ({ caller }) func isCallerApproved() : async Bool {
    AccessControl.hasPermission(accessControlState, caller, #admin) or UserApproval.isApproved(approvalState, caller);
  };

  public shared ({ caller }) func requestApproval() : async () {
    UserApproval.requestApproval(approvalState, caller);
  };

  public shared ({ caller }) func setApproval(user : Principal, status : UserApproval.ApprovalStatus) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    UserApproval.setApproval(approvalState, user, status);
  };

  public query ({ caller }) func listApprovals() : async [UserApproval.UserApprovalInfo] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    UserApproval.listApprovals(approvalState);
  };

  public shared ({ caller }) func registerOrLogin() : async UserProfile {
    let now = Time.now();
    switch (userMap.get(caller)) {
      case (?existing) {
        let updated = { existing with lastLoginAt = now };
        userMap.add(caller, updated);
        updated;
      };
      case (null) {
        if (userMap.size() == 0) {
          let systemAdmin : UserProfile = {
            principal = caller;
            email = "";
            name = "";
            role = #admin;
            status = #approved;
            createdAt = now;
            lastLoginAt = now;
          };
          userMap.add(caller, systemAdmin);
          AccessControl.assignRole(accessControlState, caller, caller, #admin);
          return systemAdmin;
        };

        let newUser : UserProfile = {
          principal = caller;
          email = "";
          name = "";
          role = #guest;
          status = #pending;
          createdAt = now;
          lastLoginAt = now;
        };
        userMap.add(caller, newUser);
        newUser;
      };
    };
  };

  public query ({ caller }) func getMyProfile() : async ?UserProfile {
    userMap.get(caller);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    userMap.get(caller);
  };

  public shared ({ caller }) func saveCallerUserProfile(name : Text, email : Text) : async () {
    let now = Time.now();
    switch (userMap.get(caller)) {
      case (?existing) {
        let updated = { existing with name = name; email = email };
        userMap.add(caller, updated);
      };
      case (null) {
        let newUser : UserProfile = {
          principal = caller;
          email = email;
          name = name;
          role = #guest;
          status = #pending;
          createdAt = now;
          lastLoginAt = now;
        };
        userMap.add(caller, newUser);
      };
    };
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userMap.get(user);
  };

  public query ({ caller }) func getAllUsers() : async [UserProfile] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can list all users");
    };
    userMap.values().toArray();
  };

  public shared ({ caller }) func updateUserRole(user : Principal, role : AppRole) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update user roles");
    };
    switch (userMap.get(user)) {
      case (null) { Runtime.trap("User not found") };
      case (?existing) {
        let updated = { existing with role = role };
        userMap.add(user, updated);
        AccessControl.assignRole(accessControlState, caller, user, appRoleToACRole(role));
      };
    };
  };

  public shared ({ caller }) func deleteUser(user : Principal) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete users");
    };
    userMap.remove(user);
  };

  public shared ({ caller }) func approveUser(user : Principal) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can approve users");
    };
    switch (userMap.get(user)) {
      case (null) { Runtime.trap("User not found") };
      case (?existing) {
        let updated = { existing with status = #approved; role = #staff };
        userMap.add(user, updated);
        AccessControl.assignRole(accessControlState, caller, user, #user);
      };
    };
  };

  public shared ({ caller }) func rejectUser(user : Principal) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can reject users");
    };
    switch (userMap.get(user)) {
      case (null) { Runtime.trap("User not found") };
      case (?existing) {
        let updated = { existing with status = #rejected };
        userMap.add(user, updated);
        AccessControl.assignRole(accessControlState, caller, user, #guest);
      };
    };
  };

  public query ({ caller }) func getInventoryItems() : async [InventoryItem] {
    if (not isApprovedUser(caller) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only approved users can view inventory");
    };
    inventoryMap.values().toArray().sort(compareByCreatedAt);
  };

  public query ({ caller }) func getInventoryItemsByCategory(category : Text) : async [InventoryItem] {
    if (not isApprovedUser(caller) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only approved users can view inventory");
    };
    inventoryMap.values().toArray()
      .filter(func(item : InventoryItem) : Bool { Text.equal(item.category, category) });
  };

  public shared ({ caller }) func addInventoryItem(
    name : Text,
    sku : Text,
    category : Text,
    quantity : Nat,
    unit : Text,
    lowStockThreshold : Nat,
    description : Text,
    price : Float,
    supplier : Text,
    expirationDate : ?Int,
    barcode : Text,
  ) : async Nat {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can add inventory items");
    };
    let id = nextItemId;
    nextItemId += 1;
    let now = Time.now();
    let item : InventoryItem = {
      id;
      name;
      sku;
      category;
      quantity;
      unit;
      lowStockThreshold;
      description;
      createdAt = now;
      updatedAt = now;
      price;
      supplier;
      expirationDate;
      barcode;
    };
    inventoryMap.add(id, item);
    id;
  };

  public shared ({ caller }) func updateInventoryItem(id : Nat, newItem : InventoryItem) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update inventory items");
    };
    switch (inventoryMap.get(id)) {
      case (null) { Runtime.trap("Item not found") };
      case (?existingItem) {
        let updatedItem = {
          newItem with
          id = existingItem.id;
          createdAt = existingItem.createdAt;
          updatedAt = Time.now();
        };
        inventoryMap.add(id, updatedItem);
      };
    };
  };

  public shared ({ caller }) func adjustInventory(
    itemId : Nat,
    adjustmentType : { #add; #remove },
    amount : Nat,
    notes : Text,
  ) : async () {
    if (not isApprovedUser(caller) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only approved users can adjust inventory");
    };
    if (not isStaffOrAdmin(caller)) {
      Runtime.trap("Unauthorized: Only staff or admins can adjust inventory");
    };

    switch (inventoryMap.get(itemId)) {
      case (null) { Runtime.trap("Item not found") };
      case (?existingItem) {
        var newQuantity = existingItem.quantity;
        switch adjustmentType {
          case (#add) { newQuantity += amount };
          case (#remove) {
            if (existingItem.quantity < amount) {
              Runtime.trap("Insufficient stock");
            };
            newQuantity -= amount;
          };
        };

        let updatedItem = { existingItem with quantity = newQuantity; updatedAt = Time.now() };
        inventoryMap.add(itemId, updatedItem);

        let callerEmail = switch (userMap.get(caller)) {
          case (?u) { u.email };
          case (null) { "" };
        };

        let logId = nextLogId;
        nextLogId += 1;
        let newLog : AdjustmentLog = {
          id = logId;
          itemId;
          itemName = existingItem.name;
          adjustedBy = caller;
          adjustedByEmail = callerEmail;
          adjustmentType;
          amount;
          newQuantity;
          notes;
          timestamp = Time.now();
        };
        adjustmentList.add(newLog);
      };
    };
  };

  public query ({ caller }) func getAdjustmentLogs() : async [AdjustmentLog] {
    if (not isStaffOrAdmin(caller)) {
      Runtime.trap("Unauthorized: Only staff or admins can view adjustment logs");
    };
    if (not isApprovedUser(caller) and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only approved users can view adjustment logs");
    };
    adjustmentList.toArray();
  };

  public shared ({ caller }) func bulkImportInventory(records : [BulkInventoryRecord]) : async BulkImportResult {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can bulk import inventory");
    };

    let skippedRows = List.empty<BulkImportError>();
    var createdCount = 0;
    var updatedCount = 0;
    var skippedCount = 0;

    for (record in records.values()) {
      switch (inventoryMap.get(record.partNumber)) {
        case (?_existing) {
          let item : InventoryItem = {
            id = record.partNumber;
            name = record.partName;
            sku = "";
            category = record.category;
            quantity = record.quantity;
            unit = "";
            lowStockThreshold = record.stockThreshold;
            description = record.description;
            createdAt = Time.now();
            updatedAt = Time.now();
            price = 0.0;
            supplier = "";
            expirationDate = null;
            barcode = "";
          };
          inventoryMap.add(record.partNumber, item);
          updatedCount += 1;
        };
        case (null) {
          let item : InventoryItem = {
            id = record.partNumber;
            name = record.partName;
            sku = "";
            category = record.category;
            quantity = record.quantity;
            unit = "";
            lowStockThreshold = record.stockThreshold;
            description = record.description;
            createdAt = Time.now();
            updatedAt = Time.now();
            price = 0.0;
            supplier = "";
            expirationDate = null;
            barcode = "";
          };
          inventoryMap.add(record.partNumber, item);
          createdCount += 1;
        };
      };
    };

    let result : BulkImportResult = {
      createdCount;
      updatedCount;
      skippedCount;
      skippedRows = skippedRows.toArray();
      newRecordCount = createdCount + updatedCount;
      newRecords = [];
    };

    result;
  };

  public shared ({ caller }) func seedDemoInventory() : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can seed inventory");
    };

    let now = Time.now();

    let demoItems : [
      (Text, Text, Text, Nat, Text, Nat, Text, Float, Text, ?Int, Text)
    ] = [
      (
        "iPhone 14 Pro",
        "IPHONE-14P-BLK-256",
        "electronics",
        50,
        "units",
        10,
        "256GB, Black, latest model",
        999.99,
        "Apple Distributors",
        null,
        "1234567890001"
      ),
      (
        "Samsung Galaxy S23",
        "SAMSUNG-S23-WHT-128",
        "electronics",
        35,
        "units",
        8,
        "128GB, White",
        849.99,
        "Samsung Electronics",
        null,
        "1234567890002"
      ),
      (
        "Blue Denim Jeans",
        "JEANS-BLUE-32",
        "apparel",
        200,
        "pieces",
        30,
        "Size 32, classic blue denim",
        49.99,
        "Fashion House",
        null,
        "1234567890003"
      ),
      (
        "White T-Shirt L",
        "TSHIRT-WHT-L",
        "apparel",
        300,
        "pieces",
        50,
        "Large, 100% cotton",
        14.99,
        "Apparel Co",
        null,
        "1234567890004"
      ),
      (
        "Office Chair",
        "CHAIR-OFF-BLK",
        "furniture",
        20,
        "units",
        5,
        "Ergonomic, black mesh",
        249.99,
        "Office World",
        null,
        "1234567890005"
      ),
      (
        "Standing Desk",
        "DESK-STAND-WHT",
        "furniture",
        15,
        "units",
        3,
        "Height adjustable, white",
        499.99,
        "Office World",
        null,
        "1234567890006"
      ),
      (
        "Cordless Drill",
        "DRILL-CORD-18V",
        "tools",
        40,
        "units",
        8,
        "18V, includes 2 batteries",
        89.99,
        "Tool Masters",
        null,
        "1234567890007"
      ),
      (
        "Hammer 16oz",
        "HAMMER-16OZ",
        "tools",
        60,
        "units",
        10,
        "16oz claw hammer",
        19.99,
        "Tool Masters",
        null,
        "1234567890008"
      ),
      (
        "A4 Paper Ream",
        "PAPER-A4-500",
        "officeSupplies",
        500,
        "reams",
        100,
        "500 sheets per ream, 80gsm",
        5.99,
        "Paper Plus",
        null,
        "1234567890009"
      ),
      (
        "Ballpoint Pens Box",
        "PEN-BALL-BLK-50",
        "officeSupplies",
        150,
        "boxes",
        20,
        "50 black pens per box",
        8.99,
        "Stationery World",
        null,
        "1234567890010"
      ),
      (
        "Steel Bolts M8x30",
        "BOLT-M8-30-SS",
        "hardware",
        1000,
        "pieces",
        200,
        "M8x30mm stainless steel",
        0.25,
        "Fasteners Inc",
        null,
        "1234567890011"
      ),
      (
        "Paracetamol 500mg",
        "MED-PARA-500-100",
        "healthCare",
        200,
        "boxes",
        50,
        "100 tablets per box",
        3.49,
        "PharmaCo",
        (do { let d : Int = now + 63_072_000_000_000_000; ?d }),
        "1234567890012"
      ),
    ];

    for (
      (
        name,
        sku,
        category,
        quantity,
        unit,
        threshold,
        desc,
        price,
        supplier,
        expiry,
        barcode
      ) in demoItems.vals()
    ) {
      let id = nextItemId;
      nextItemId += 1;
      let item : InventoryItem = {
        id;
        name;
        sku;
        category;
        quantity;
        unit;
        lowStockThreshold = threshold;
        description = desc;
        createdAt = now;
        updatedAt = now;
        price;
        supplier;
        expirationDate = expiry;
        barcode;
      };
      inventoryMap.add(id, item);
    };
  };

  public shared ({ caller }) func seedDemoUsers() : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can seed demo users");
    };

    let now = Time.now();

    let demoUsers : [(Text, Text, AppRole, UserStatus)] = [
      ("alice@example.com", "Alice Admin", #admin, #approved),
      ("bob@example.com", "Bob Staff", #staff, #approved),
      ("carol@example.com", "Carol Guest", #guest, #approved),
      ("dave@example.com", "Dave Pending", #guest, #pending),
      ("eve@example.com", "Eve Rejected", #guest, #rejected),
    ];

    var idx : Nat = 100;
    for ((email, name, role, status) in demoUsers.vals()) {
      let fakePrincipal = Principal.fromText("2vxsx-fae");
      let demoProfile : UserProfile = {
        principal = fakePrincipal;
        email;
        name;
        role;
        status;
        createdAt = now - (Int.fromNat(idx) * 86_400_000_000_000);
        lastLoginAt = now - (Int.fromNat(idx) * 3_600_000_000_000);
      };
      userMap.add(fakePrincipal, demoProfile);
      idx += 1;
    };
  };
};
