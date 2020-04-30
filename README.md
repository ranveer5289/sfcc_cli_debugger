# Salesforce Command Line Debugger
An experimental command line debugger for Salesforce Commerce Cloud. This provides an interface similar to pdb debugger for python.

# Configuration

Before starting to debug it is important to configure the debugger. The debugger configuration is part of `dw.j` file.
Rename the `dw.js.sample` file to `dw.js` and configure it.

Add your instance hostname & credentials.

`workspacePath` - This should be path to the folder where your cartridges resides. For an SFRA project this path will be  `/my_user/home/path/till/cartridges/`

# Installation

Download/clone the repository & run `npm install` to install the dependencies.

# Usage

Debugger is based on the [node](https://nodejs.org/api/repl.html#repl_replserver_definecommand_keyword_cmd) repl module.

Run the debugger script with below command. After running this you will enter into node repl prompt `sfcc-cli-debug`

```js
node debug.js
sfcc-cli-debug >
```

The commands recognized by the debugger are listed in the help section.

Commands that the debugger prompt doesn't recognize are assumed to be code statements and are executed in the context of the program being debugged against SFCC server.

```js
sfcc-cli-debug > .help
.start    Attach a Debugger Client
.stop     Detach a Debugger Client
.b        Add a breakpoint
.break    Alias : Add a breakpoint
.bi       Add a breakpoint interactively
.sbr      Add a breakpoint and resume/continue
.ct       Get current thread
.v        Get Variables in scope
.m        Get members of variables
.l        print source code
.si       Step Into
.sn       Step Over/Next to next line
.so       Step Out
.r        Resume and halt at next breakpoint
.p        Evaluate On Server and print expression value
.gb       Display all breakpoints
.rb       remove breakpoint(s)
.exit     Exit the repl
```


## .start
Use this command to connect/attach the debugger to your sandbox. This should be first command you should run before starting the debugging session

```js
sfcc-cli-debug > .start
Debugger listening on server
sfcc-cli-debug >
```

## .stop
Use this command to stop the debugger connected/attached to your sandbox.

```js
sfcc-cli-debug > .stop
Debugger disconnected from server
sfcc-cli-debug >
```

## Add breakpoint

Once your debugger is connected it is time to add breakpoint. There are two ways to add a breakpoint

### Manually

Use command `.b lineNumber,scriptPath` or `.break lineNumber,scriptPath`

lineNumber - line number where breakpoint will be added

scriptPath - Location of the `.ds or .js` file. This path should be after the `/cartridges` folder and is an absolute path with leading `/`.


```js
sfcc-cli-debug > .break 17,/app_storefront_controllers/cartridge/controllers/Home.js
Breakpoint successfully set on server at line# 17
sfcc-cli-debug >
```

### Interactively

Use command `.bi` and it will open an interactive prompt. In this prompt you can search(fuzzy) & select the file of your choice. 
After the file is selected you will be asked for lineNumber where breakpoint should be added.


### Additional breakpoint commands

It is not always an easy experience in cli when while debugging you have to set breakpoint at multiple locations in the same file.
In order to make this a bit easy you can use the `.sbr lineNumber` command.

`.sbr` command takes only one argument the `lineNumber`. `Script Path` is assumed to be the current script where debugger is halted.
In this command debugger is also automatically resumed(`r`) to the new breakpoint location.


`.gb` command can be used to list down all the breakpoints added on server

`.rb` command can be used to remove the breakpoints on the server. It takes an additional argument `breakpoint id` if a specific breakpoint has to be removed. If not specified all breakpoints are removed.
`breakpoint id` is returned as the response of `.gb` command


## Get Variables

Debugging experience without inspecting the variables & their current values in scope is no fun. So, `.v` command can be used to get all the variables currently in scope.


## Get member of variables

`.v` commands return the variables but if you want to drill down further into a variable and it's properties use `.m variable_name` command. This command can be used recursively i.e. `.m variable_name.property_1`

## Step Over(Next)/Into/Out/Resume

These are standard debugger command to step next, over & into.

`.sn` - Step Next/Over to the next line in the script.

`.si` - Step into the function at the current location.

`.so` - Step out of the current location & return to parent

`.r` - Resume to the next breakpoint location. If no next breakpoint location is found release the debugger.

## Print source code

Helper function to print the lines of code. 

`.l offset` - if no offset is specified 5 lines around(above/below) the current breakpoint location are displayed in the terminal.

Current location where debugger is halted is highligted with `-->` and a yellow color.


## Eval

`.p expression` can be used to evaluate an expression in real-time on SFCC server.

Debugger also supports evaluating command by directly entering it on the terminal.


## Exit

`.exit` is a standard repl command to exit out of the repl. `.exit` will also stop the debugger and release all breakpoint from the server


# All Commands

Command | Purpose
----------------|----------------------------
.start | Start the debugger session
.stop | Stops the debugger session and release/delete all breakpoints
.b .break | Add a breakpoint at the specified lineNumber & scriptPath
.bi | Add a breakpoint interactively
.sbr | Add a breakpoint at specified lineNumber & resume the debugger to newly added breakpointt
.gb | Get all breakpoints
.rb | Remove all breakpoints or a specific breakpoint
.v | Get all variables in scope of the current script
.m | Get all member objects for the specified variables
.sn | Step next/over to the next line
.si | Step into the function
.so | Step out
.r | Resume to the next breakpoint location. If no next breakpoint location is found release the debugger.
.l | print source code in terminal
.p | Evaluate the expression in real-time and print its result
