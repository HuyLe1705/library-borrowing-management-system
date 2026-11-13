/**
 * @openapi
 * {
 *   "/api/borrow-requests/{id}/approve": {
 *     "patch": {
 *       "summary": "Reserve an available copy (staff only); no body required",
 *       "tags": [
 *         "BorrowRequests"
 *       ],
 *       "security": [
 *         {
 *           "BearerAuth": []
 *         }
 *       ],
 *       "parameters": [
 *         {
 *           "in": "path",
 *           "name": "id",
 *           "required": true,
 *           "schema": {
 *             "type": "integer",
 *             "minimum": 1
 *           }
 *         }
 *       ],
 *       "responses": {
 *         "200": {
 *           "description": "Success; response is {success, data}."
 *         },
 *         "400": {
 *           "description": "Invalid input or business rule."
 *         },
 *         "401": {
 *           "description": "Authentication required."
 *         },
 *         "403": {
 *           "description": "Forbidden or borrower is not eligible."
 *         },
 *         "404": {
 *           "description": "Record not found."
 *         },
 *         "409": {
 *           "description": "Already processed, duplicate pending request, or no available copy."
 *         }
 *       },
 *       "requestBody": {
 *         "required": false,
 *         "content": {
 *           "application/json": {
 *             "schema": {
 *               "type": "object",
 *               "properties": {
 *                 "adminNote": {
 *                   "type": "string",
 *                   "maxLength": 500
 *                 },
 *                 "copyId": {
 *                   "type": "integer",
 *                   "minimum": 1
 *                 },
 *                 "pickupDeadline": {
 *                   "type": "string",
 *                   "format": "date"
 *                 }
 *               },
 *               "required": []
 *             }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   "/api/borrow-requests/{id}/reject": {
 *     "patch": {
 *       "summary": "Reject a pending reservation (staff only)",
 *       "tags": [
 *         "BorrowRequests"
 *       ],
 *       "security": [
 *         {
 *           "BearerAuth": []
 *         }
 *       ],
 *       "parameters": [
 *         {
 *           "in": "path",
 *           "name": "id",
 *           "required": true,
 *           "schema": {
 *             "type": "integer",
 *             "minimum": 1
 *           }
 *         }
 *       ],
 *       "responses": {
 *         "200": {
 *           "description": "Success; response is {success, data}."
 *         },
 *         "400": {
 *           "description": "Invalid input or business rule."
 *         },
 *         "401": {
 *           "description": "Authentication required."
 *         },
 *         "403": {
 *           "description": "Forbidden or borrower is not eligible."
 *         },
 *         "404": {
 *           "description": "Record not found."
 *         },
 *         "409": {
 *           "description": "Already processed, duplicate pending request, or no available copy."
 *         }
 *       },
 *       "requestBody": {
 *         "required": false,
 *         "content": {
 *           "application/json": {
 *             "schema": {
 *               "type": "object",
 *               "properties": {
 *                 "adminNote": {
 *                   "type": "string",
 *                   "maxLength": 500
 *                 }
 *               },
 *               "required": []
 *             }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   "/api/borrow-requests/{id}/fulfill": {
 *     "patch": {
 *       "summary": "Hand over a reserved copy and create a loan atomically (staff only)",
 *       "tags": [
 *         "BorrowRequests"
 *       ],
 *       "security": [
 *         {
 *           "BearerAuth": []
 *         }
 *       ],
 *       "parameters": [
 *         {
 *           "in": "path",
 *           "name": "id",
 *           "required": true,
 *           "schema": {
 *             "type": "integer",
 *             "minimum": 1
 *           }
 *         }
 *       ],
 *       "responses": {
 *         "200": {
 *           "description": "Success; response is {success, data}."
 *         },
 *         "400": {
 *           "description": "Invalid input or business rule."
 *         },
 *         "401": {
 *           "description": "Authentication required."
 *         },
 *         "403": {
 *           "description": "Forbidden or borrower is not eligible."
 *         },
 *         "404": {
 *           "description": "Record not found."
 *         },
 *         "409": {
 *           "description": "Already processed, duplicate pending request, or no available copy."
 *         }
 *       },
 *       "requestBody": {
 *         "required": false,
 *         "content": {
 *           "application/json": {
 *             "schema": {
 *               "type": "object",
 *               "properties": {
 *                 "adminNote": {
 *                   "type": "string",
 *                   "maxLength": 500
 *                 }
 *               },
 *               "required": []
 *             }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   "/api/renewal-requests": {
 *     "get": {
 *       "summary": "List records; readers see only their own",
 *       "tags": [
 *         "RenewalRequests"
 *       ],
 *       "security": [
 *         {
 *           "BearerAuth": []
 *         }
 *       ],
 *       "parameters": [
 *         {
 *           "in": "query",
 *           "name": "status",
 *           "schema": {
 *             "type": "string",
 *             "enum": [
 *               "PENDING",
 *               "APPROVED",
 *               "REJECTED",
 *               "CANCELLED"
 *             ]
 *           }
 *         },
 *         {
 *           "in": "query",
 *           "name": "userCode",
 *           "description": "Staff only; readers always see their own records.",
 *           "schema": {
 *             "type": "string"
 *           }
 *         }
 *       ],
 *       "responses": {
 *         "200": {
 *           "description": "Success; response is {success, data}."
 *         },
 *         "400": {
 *           "description": "Invalid input or business rule."
 *         },
 *         "401": {
 *           "description": "Authentication required."
 *         },
 *         "403": {
 *           "description": "Forbidden or borrower is not eligible."
 *         },
 *         "404": {
 *           "description": "Record not found."
 *         },
 *         "409": {
 *           "description": "Already processed, duplicate pending request, or no available copy."
 *         }
 *       }
 *     },
 *     "post": {
 *       "summary": "Request a 7-day extension",
 *       "tags": [
 *         "RenewalRequests"
 *       ],
 *       "security": [
 *         {
 *           "BearerAuth": []
 *         }
 *       ],
 *       "parameters": [],
 *       "responses": {
 *         "201": {
 *           "description": "Success; response is {success, data}."
 *         },
 *         "400": {
 *           "description": "Invalid input or business rule."
 *         },
 *         "401": {
 *           "description": "Authentication required."
 *         },
 *         "403": {
 *           "description": "Forbidden or borrower is not eligible."
 *         },
 *         "404": {
 *           "description": "Record not found."
 *         },
 *         "409": {
 *           "description": "Already processed, duplicate pending request, or no available copy."
 *         }
 *       },
 *       "requestBody": {
 *         "required": true,
 *         "content": {
 *           "application/json": {
 *             "schema": {
 *               "type": "object",
 *               "properties": {
 *                 "borrowRecordId": {
 *                   "type": "integer",
 *                   "minimum": 1
 *                 },
 *                 "note": {
 *                   "type": "string",
 *                   "maxLength": 500
 *                 }
 *               },
 *               "required": [
 *                 "borrowRecordId"
 *               ]
 *             }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   "/api/fines": {
 *     "get": {
 *       "summary": "List records; readers see only their own",
 *       "tags": [
 *         "Fines"
 *       ],
 *       "security": [
 *         {
 *           "BearerAuth": []
 *         }
 *       ],
 *       "parameters": [
 *         {
 *           "in": "query",
 *           "name": "status",
 *           "schema": {
 *             "type": "string",
 *             "enum": [
 *               "UNPAID",
 *               "PAID"
 *             ]
 *           }
 *         },
 *         {
 *           "in": "query",
 *           "name": "userCode",
 *           "description": "Staff only; readers always see their own records.",
 *           "schema": {
 *             "type": "string"
 *           }
 *         }
 *       ],
 *       "responses": {
 *         "200": {
 *           "description": "Success; response is {success, data}."
 *         },
 *         "400": {
 *           "description": "Invalid input or business rule."
 *         },
 *         "401": {
 *           "description": "Authentication required."
 *         },
 *         "403": {
 *           "description": "Forbidden or borrower is not eligible."
 *         },
 *         "404": {
 *           "description": "Record not found."
 *         },
 *         "409": {
 *           "description": "Already processed, duplicate pending request, or no available copy."
 *         }
 *       }
 *     },
 *     "post": {
 *       "summary": "Create missing overdue fine for a returned loan; 5000 VND/day (staff only)",
 *       "tags": [
 *         "Fines"
 *       ],
 *       "security": [
 *         {
 *           "BearerAuth": []
 *         }
 *       ],
 *       "parameters": [],
 *       "responses": {
 *         "201": {
 *           "description": "Success; response is {success, data}."
 *         },
 *         "400": {
 *           "description": "Invalid input or business rule."
 *         },
 *         "401": {
 *           "description": "Authentication required."
 *         },
 *         "403": {
 *           "description": "Forbidden or borrower is not eligible."
 *         },
 *         "404": {
 *           "description": "Record not found."
 *         },
 *         "409": {
 *           "description": "Already processed, duplicate pending request, or no available copy."
 *         }
 *       },
 *       "requestBody": {
 *         "required": true,
 *         "content": {
 *           "application/json": {
 *             "schema": {
 *               "type": "object",
 *               "properties": {
 *                 "borrowRecordId": {
 *                   "type": "integer",
 *                   "minimum": 1
 *                 },
 *                 "reason": {
 *                   "type": "string",
 *                   "maxLength": 255
 *                 }
 *               },
 *               "required": [
 *                 "borrowRecordId"
 *               ]
 *             }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   "/api/renewal-requests/{id}/approve": {
 *     "patch": {
 *       "summary": "Approve a pending renewal; approval rechecks eligibility and extends the loan atomically",
 *       "tags": [
 *         "RenewalRequests"
 *       ],
 *       "security": [
 *         {
 *           "BearerAuth": []
 *         }
 *       ],
 *       "parameters": [
 *         {
 *           "in": "path",
 *           "name": "id",
 *           "required": true,
 *           "schema": {
 *             "type": "integer",
 *             "minimum": 1
 *           }
 *         }
 *       ],
 *       "responses": {
 *         "200": {
 *           "description": "Success; response is {success, data}."
 *         },
 *         "400": {
 *           "description": "Invalid input or business rule."
 *         },
 *         "401": {
 *           "description": "Authentication required."
 *         },
 *         "403": {
 *           "description": "Forbidden or borrower is not eligible."
 *         },
 *         "404": {
 *           "description": "Record not found."
 *         },
 *         "409": {
 *           "description": "Already processed, duplicate pending request, or no available copy."
 *         }
 *       },
 *       "requestBody": {
 *         "required": false,
 *         "content": {
 *           "application/json": {
 *             "schema": {
 *               "type": "object",
 *               "properties": {
 *                 "adminNote": {
 *                   "type": "string",
 *                   "maxLength": 500
 *                 }
 *               },
 *               "required": []
 *             }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   "/api/renewal-requests/{id}/reject": {
 *     "patch": {
 *       "summary": "Reject a pending renewal; approval rechecks eligibility and extends the loan atomically",
 *       "tags": [
 *         "RenewalRequests"
 *       ],
 *       "security": [
 *         {
 *           "BearerAuth": []
 *         }
 *       ],
 *       "parameters": [
 *         {
 *           "in": "path",
 *           "name": "id",
 *           "required": true,
 *           "schema": {
 *             "type": "integer",
 *             "minimum": 1
 *           }
 *         }
 *       ],
 *       "responses": {
 *         "200": {
 *           "description": "Success; response is {success, data}."
 *         },
 *         "400": {
 *           "description": "Invalid input or business rule."
 *         },
 *         "401": {
 *           "description": "Authentication required."
 *         },
 *         "403": {
 *           "description": "Forbidden or borrower is not eligible."
 *         },
 *         "404": {
 *           "description": "Record not found."
 *         },
 *         "409": {
 *           "description": "Already processed, duplicate pending request, or no available copy."
 *         }
 *       },
 *       "requestBody": {
 *         "required": false,
 *         "content": {
 *           "application/json": {
 *             "schema": {
 *               "type": "object",
 *               "properties": {
 *                 "adminNote": {
 *                   "type": "string",
 *                   "maxLength": 500
 *                 }
 *               },
 *               "required": []
 *             }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   "/api/renewal-requests/{id}/cancel": {
 *     "patch": {
 *       "summary": "Cancel a pending renewal; approval rechecks eligibility and extends the loan atomically",
 *       "tags": [
 *         "RenewalRequests"
 *       ],
 *       "security": [
 *         {
 *           "BearerAuth": []
 *         }
 *       ],
 *       "parameters": [
 *         {
 *           "in": "path",
 *           "name": "id",
 *           "required": true,
 *           "schema": {
 *             "type": "integer",
 *             "minimum": 1
 *           }
 *         }
 *       ],
 *       "responses": {
 *         "200": {
 *           "description": "Success; response is {success, data}."
 *         },
 *         "400": {
 *           "description": "Invalid input or business rule."
 *         },
 *         "401": {
 *           "description": "Authentication required."
 *         },
 *         "403": {
 *           "description": "Forbidden or borrower is not eligible."
 *         },
 *         "404": {
 *           "description": "Record not found."
 *         },
 *         "409": {
 *           "description": "Already processed, duplicate pending request, or no available copy."
 *         }
 *       },
 *       "requestBody": {
 *         "required": false,
 *         "content": {
 *           "application/json": {
 *             "schema": {
 *               "type": "object",
 *               "properties": {
 *                 "adminNote": {
 *                   "type": "string",
 *                   "maxLength": 500
 *                 }
 *               },
 *               "required": []
 *             }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   "/api/fines/{id}/pay": {
 *     "patch": {
 *       "summary": "Confirm cash received (staff only); duplicate payments are rejected",
 *       "tags": [
 *         "Fines"
 *       ],
 *       "security": [
 *         {
 *           "BearerAuth": []
 *         }
 *       ],
 *       "parameters": [
 *         {
 *           "in": "path",
 *           "name": "id",
 *           "required": true,
 *           "schema": {
 *             "type": "integer",
 *             "minimum": 1
 *           }
 *         }
 *       ],
 *       "responses": {
 *         "200": {
 *           "description": "Success; response is {success, data}."
 *         },
 *         "400": {
 *           "description": "Invalid input or business rule."
 *         },
 *         "401": {
 *           "description": "Authentication required."
 *         },
 *         "403": {
 *           "description": "Forbidden or borrower is not eligible."
 *         },
 *         "404": {
 *           "description": "Record not found."
 *         },
 *         "409": {
 *           "description": "Already processed, duplicate pending request, or no available copy."
 *         }
 *       }
 *     }
 *   }
 * }
 */
