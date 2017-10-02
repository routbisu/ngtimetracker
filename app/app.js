var app = angular.module("timetrackerApp", ['ui.router']);

app.controller('menuCtrl', function($scope, $state, LocalStorageMockDBService) {
    $scope.test = "Hello";
    $scope.logOut = function() {
        console.log('Logged out'); 
        LocalStorageMockDBService.logOut();   
        $state.go('login');  
    }
});

// Add timesheet entry service
app.service('LocalStorageMockDBService', function () {

    // Check localstorage
    this.checkLocalStorage = function () {
        if (typeof (Storage) === "undefined") {
            return false;
        } else {
            if (!localStorage.getItem('TimeTrackerData')) {
                // Create instance if not found
                localStorage.TimeTrackerData = JSON.stringify([]);
            }
            if (!localStorage.getItem('LastLoginTime')) {
                // Create instance if not found
                var nowTimestamp = new Date();
                localStorage.LastLoginTime = nowTimestamp.toLocaleString();
            }
            if (!localStorage.getItem('UserData')) {
                // Add default user
                var userData = [
                    { EmpID: '10001', EmpName: 'Kanakdeepa', Password: 'password' }
                ];
                localStorage.UserData = JSON.stringify(userData);
            }
        }
    };

    // Is logged in
    this.isLoggedIn = function () {
        if (sessionStorage.getItem('LoggedInID') != null && sessionStorage.getItem('LoggedInName') != null) {
            return true;
        }
        return false;
    }

    // Get an object for logged in user
    this.getLoggedInUser = function () {
        return {
            EmpID: sessionStorage.LoggedInID,
            EmpName: sessionStorage.LoggedInName
        };
    }

    // Logout current user
    this.logOut = function () {
        sessionStorage.removeItem('LoggedInID');
        sessionStorage.removeItem('LoggedInName');
    }

    // Calculate time difference from Locale Time Strings
    this.calculateTimeDifference = function (time1, time2) {
        try {
            var t1 = new Date(time1);
            var t2 = new Date(time2);
            var timeDiffStr = '';

            var diffSeconds = Math.abs(t2 - t1) / 1000;

            if (diffSeconds < 60) {
                timeDiffStr = 'Just now';
            } else if (diffSeconds < 3600) {
                timeDiffStr = Math.round(diffSeconds / 60) + ' min(s) ago';
            } else if (diffSeconds < 86400) {
                timeDiffStr = Math.round(diffSeconds / 3600) + ' hour(s) ago';
            } else if (diffSeconds >= 86400) {
                timeDiffStr = Math.round(diffSeconds / 86400) + ' day(s) ago';
            }

            return timeDiffStr;
        } catch (ex) {
            return false;
        }
    }

    // Get last login duration (n mins/hours ago)
    this.getLastLoginDuration = function () {
        var nowTimeString = (new Date()).toLocaleString();
        return calculateTimeDifference(localStorage.LastLoginTime, nowTimeString);
    }

    this.setLastLoginTime = function () {
        localStorage.LastLoginTime = (new Date()).toLocaleString();
    }

    /* Functions for timesheet operations */
    // Add timesheet - Overwrites any existing record for same day
    this.addTimesheet = function (timesheet) {
        var timesheetData = JSON.parse(localStorage.TimeTrackerData);
        var isExist = false;

        for (var i = 0; i < timesheetData.length; i++) {
            if (timesheetData[i].Date === timesheet.Date && timesheetData[i].EmpID === timesheet.EmpID) {
                timesheetData[i].InTime = timesheet.InTime;
                timesheetData[i].OutTime = timesheet.OutTime;
                timesheetData[i].Hours = timesheet.Hours;
                isExist = true;
            }
        }

        if (!isExist) {
            timesheetData.push(timesheet);
        }

        localStorage.TimeTrackerData = JSON.stringify(timesheetData);
    }

    this.fetchTimesheet = function (empID, isAll) {
        if (isAll) {
            return JSON.parse(localStorage.TimeTrackerData);
        } else {
            // Fetch timesheet data
            var timesheetData = JSON.parse(localStorage.TimeTrackerData);
            // Filter for employee ID
            var employeeData = timesheetData.filter(function (data) {
                return data.EmpID === empID;
            });

            return employeeData;
        }
    }

    this.fetchTimeSheetForEmp = function (empID, date) {
        // Fetch timesheet data
        var timesheetData = JSON.parse(localStorage.TimeTrackerData);
        // Filter for employee ID
        var employeeData = timesheetData.filter(function (data) {
            return (data.EmpID === empID && data.Date === date);
        });
        if (employeeData.length > 0) {
            return employeeData[0];
        } else {
            return false;
        }
    }

    this.resetData = function () {
        localStorage.TimeTrackerData = JSON.stringify([]);
        location.reload();
    }

    // The callback will be called when working hours is less than 4 hours
    this.calculateDuration = function (inTime, outTime, lessHours = null, moreHours = null) {
        try {
            var ary1 = inTime.split(':'), ary2 = outTime.split(':');

            // Validation for hours and mins limit (0 - 12, 0 - 60)
            if (parseInt(ary1[0], 10) > 23 || parseInt(ary1[0], 10) < 0 ||
                parseInt(ary2[0], 10) > 23 || parseInt(ary2[0], 10) < 0) {
                return false;
            }
            if (parseInt(ary1[1], 10) > 59 || parseInt(ary1[1], 10) < 0 ||
                parseInt(ary2[1], 10) > 59 || parseInt(ary2[1], 10) < 0) {
                return false;
            }

            var minsdiff = parseInt(ary2[0], 10) * 60 + parseInt(ary2[1], 10)
                - parseInt(ary1[0], 10) * 60 - parseInt(ary1[1], 10);

            if (minsdiff < 0) {
                return 'negative';
            };

            var hoursDiff = 100 + Math.floor(minsdiff / 60);
            var minsDiff = 100 + minsdiff % 60;
            if (isNaN(hoursDiff) || isNaN(minsDiff)) {
                return false;
            }

            // If time is less than 4 hours (240 minutes) then execute the callback
            if (lessHours !== null || moreHours !== null) {
                if (((hoursDiff - 100) * 60 + (minsDiff - 100)) < (240)) {
                    lessHours();
                } else {
                    moreHours();
                }
            }

            return String(String(hoursDiff).substr(1) + ':' + String(minsDiff).substr(1));
        } catch (ex) {
            console.log(ex);
            return false;
        }
    }

    /* Functions for user login/sign up operations */
    // Returns user object if valid credentials are provided
    this.checkLogin = function (empID, password) {
        var usersData = JSON.parse(localStorage.UserData);

        var validUser = usersData.filter(function (data) {
            if (data.EmpID == empID && data.Password == password)
                return data;
        });

        if (validUser.length > 0) {
            return validUser[0];
        } else {
            return false;
        }
    }

    // Check if employee ID already exists
    this.isAlreadyExistUser = function (empID) {
        var usersData = JSON.parse(localStorage.UserData);
        var user = usersData.filter(function (data) {
            if (data.EmpID == empID)
                return data;
        });
        if (user.length > 0)
            return true;

        return false;
    }

    // Add new user
    this.addUser = function (empID, empName, password) {
        if (this.isAlreadyExistUser(empID))
            return 'This employee ID already exists!';

        var usersData = JSON.parse(localStorage.UserData);
        usersData.push({
            EmpID: empID,
            EmpName: empName,
            Password: password
        });
        localStorage.UserData = JSON.stringify(usersData);
        return 'success';
    }

    // Prompt user to Download CSV
    this.downloadCSV = function (filename, text) {
        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    // Generate CSV text and download
    this.generateCSV = function () {
        var csvData = Papa.unparse(JSON.parse(sessionStorage.lastReport));
        console.log(csvData);
        if (csvData && csvData.length > 0)
            downloadCSV('TimesheetReport.csv', csvData);
        else
            alert('There was an unexpected error');
    }

    // Redirect to page
    this.redirectTo = function(url) {
        window.location = url;
    }
});

// UI Router configuration
app.config(function ($stateProvider, $urlRouterProvider) {

    $stateProvider
        // Home state
        .state('home', {
            url: '/home',
            templateUrl: 'app/partials/home.html',
            controller: 'homeCtrl'
        })

        // Login state
        .state('login', {
            url: '/login',
            templateUrl: 'app/partials/login.html',
            controller: 'loginCtrl'
        })

        // Reports state
        .state('reports', {
            url: '/reports',
            templateUrl: 'app/partials/reports.html'
        });

    $urlRouterProvider.otherwise('/home');
});



// Login controller
app.controller('loginCtrl', function ($scope, $state, LocalStorageMockDBService) {
    $scope.showSignUpForm = function() {
        $scope.signupArea = true;
        $scope.loginArea = false;
        $scope.signupLink = false;
        $scope.loginLink = true;
    }

    $scope.showLoginForm = function() {
        $scope.signupArea = false;
        $scope.loginArea = true;
        $scope.signupLink = true;
        $scope.loginLink = false;
    }

    $scope.checkLogin = function() {
        var user = 
            LocalStorageMockDBService.checkLogin($scope.txtLoginEmpID, $scope.txtLoginPassword);

        if(user) {
            // Set log in user ID and name in session storage
            // and redirect to index page
            sessionStorage.LoggedInID = user.EmpID;
            sessionStorage.LoggedInName = user.EmpName;
            $state.go('home');
        } else {
            $scope.errorMessage = 'Incorrect Employee ID / Password.';
        }
    }

    $scope.signUp = function() {
        if(!$scope.txtSignupEmpID || ('' + $scope.txtSignupEmpID).length !== 5) {
            $scope.errorMessage = 'Enter 5 digit emp ID.';
            return;
        }

        if(!$scope.txtSignupEmpName || $scope.txtSignupEmpName.trim() === '') {
            $scope.errorMessage = 'Please enter employee name.';
            return;
        }

        if(!$scope.txtSignupPassword || $scope.txtSignupPassword.trim() === '' 
            || !$scope.txtSignupPassword1 || $scope.txtSignupPassword1.trim() === '') {
                $scope.errorMessage = 'Please enter password and confirm password.';
            return;
        }

        // Passwords must match
        if($scope.txtSignupPassword !== $scope.txtSignupPassword1) {
            $scope.errorMessage = 'Passwords didn\'t match.';
            return;
        }
        
        // Add new user
        var newUser = LocalStorageMockDBService.addUser($scope.txtSignupEmpID, 
            $scope.txtSignupEmpName, $scope.txtSignupPassword);
        console.log(newUser);
        if(newUser === 'success') {
            $scope.errorMessage = 'The user has been added. Please login to continue.';
        } else  {
            $scope.errorMessage = newUser;
        }
    }

    var init = function() {
        // If already logged in then redirect to home page
        if(LocalStorageMockDBService.isLoggedIn()) {
            $state.go('home');
        }
        // Initialize error message to null
        $scope.errorMessage = null;

        // Hide sign-up form by default
        $scope.showLoginForm();

        // Disable login button
        $scope.loginButtonDisabled = true;
    }

    init();    
});

// Home Controller
app.controller('homeCtrl', function ($scope, $state, $timeout, LocalStorageMockDBService) {
    // Check if local storage is available
    $scope.noLocalStorage = LocalStorageMockDBService.checkLocalStorage();

    // If not logged in then redirect to login page
    if(!LocalStorageMockDBService.isLoggedIn()) {
        $state.go('login');
    }

    // Set success and error messages to null
    $scope.successMessage = null;
    $scope.errorMessage = null;

    // Add timesheet
    $scope.saveTimeSheet = function () {
        var timeSheetData = {
            EmpID: $scope.empID,
            EmpName: $scope.empName,
            Date: $scope.date,
            InTime: $scope.inTime,
            OutTime: $scope.outTime,
            Hours: $scope.hours
        };
        console.log(timeSheetData);

        // Validations
        if(!timeSheetData.Date) { 
            $scope.errorMessage = 'Please enter date';
            return;
        }

        if(!timeSheetData.InTime) { 
            $scope.errorMessage = 'Please enter in time';
            return;
        }

        if(!timeSheetData.OutTime) { 
            $scope.errorMessage = 'Please enter out time';
            return;
        }
        
        LocalStorageMockDBService.addTimesheet(timeSheetData);
        $scope.successMessage = 'Timesheet data saved successfully';
        $timeout(function() { 
            $scope.successMessage = null 
            $scope.date = '';
            $scope.inTime = '';
            $scope.outTime = '';
            $scope.hours = '';
        }, 3000);
    }

    // Show duration
    $scope.showDuration = function() {
        var duration = LocalStorageMockDBService.calculateDuration($scope.inTime, $scope.outTime, function() {
            $scope.lessHours = true;
        }, function() { $scope.lessHours = false; });
        
        if(duration) {
            $scope.hours = duration;
        } 
    }

    // Show existing time data for a date
    $scope.showExistingTime = function() {
        var empData = LocalStorageMockDBService.fetchTimeSheetForEmp(sessionStorage.LoggedInID, $scope.date);
        if(empData) {
            $scope.inTime = empData.InTime;
            $scope.outTime = empData.OutTime;
            $scope.showDuration();
        } else {
            $scope.inTime = '';
            $scope.outTime = '';
            $scope.hours = '';
        }
    }

    function init() {
        $scope.empID = sessionStorage.LoggedInID;
        $scope.empName = sessionStorage.LoggedInName;
    }

    init();
});