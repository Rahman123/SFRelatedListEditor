({
    doInit : function(component, event, helper) {  
        if(component.get("v.fieldSetName") && component.get("v.relatedObjectName")){
            var metadataAction = component.get("c.getFieldSetMetadata");
            
            metadataAction.setParams({
                "objectName": component.get("v.relatedObjectName"),
                "fielSetName": component.get("v.fieldSetName")
            });
            
            metadataAction.setCallback(this, function(res) {            
                if (res.getState() === "SUCCESS" && res.getReturnValue()) { 
                    //Set the display columns   
                    component.set("v.columns", res.getReturnValue().columns);                                               
                                        
                    //Set the display label        
                    var displayLabel = component.get("v.customLabel") || res.getReturnValue().label;                        
                    component.set("v.displayLabel", displayLabel); 
                                        
                    //Update the default values for the current record
                    var defaultValues = component.get("v.defaultValues");
                    component.set("v.defaultValues", defaultValues.replace("$recordId", component.get("v.recordId"))); 
                    
                    //Update the filter property for the current record
                    var filter = component.get("v.filter") || "{}";
                    component.set("v.filter", filter.replace("$recordId", component.get("v.recordId"))); 
                    
                    //Toogle the total row
                    helper.toogleTotal(component, event);                    
                    
                    //Load items 
                    helper.loadItems(component);                      
                } 
                else if (res.getState() === "ERROR") {
                    $A.log("Errors", res.getError());
                }           
            });  
            
            $A.enqueueAction(metadataAction);             
        }
    },    
    startEdit : function(component, event, helper) {
        //Save a copy of items
        component.set("v.oldItems", JSON.parse(JSON.stringify(component.get("v.items"))));
        
        //Refresh the items
        helper.refreshItems(component, component.get("v.items"), "write");               
        
        //Refresh the UI elements(Edit button and actions)
        helper.refreshUIElements(component, event);
    },
    cancelEdit : function(component, event, helper) {         
        helper.refreshItems(component, component.get("v.oldItems"), "read");                       
        helper.refreshUIElements(component, event);        
    },
    saveEdit : function(component, event, helper) {                       
        if(helper.checkItems(component)){
            //Update the items
            var items = helper.updateItems(component);
            
            //OnSave items callback
            function onSaveSuccess(res){
                //Set the display mode
                component.set("v.displayMode", "read"); 
                
                //Refresh the items
                helper.loadItems(component, function(newItems){                    
                    //Refresh the UI elements
                    helper.refreshUIElements(component, event);                    
                    
                    //Display a confirmation Taost
                    var toastEvent = $A.get("e.force:showToast");
                    toastEvent.setParams({
                        "title": "Success!",
                        "type" : "success",
                        "message": "The items list has been updated successfully"
                    });
                    toastEvent.fire(); 
                    
                    $A.get('e.force:refreshView').fire();
                });                                
            }
            
            function onSaveError(res){                      
                var errMsg = null;
                var errors = res.getError();
                
                if(errors[0] && errors[0].message){
                    errMsg = errors[0].message;
                } 
                if(errors[0] && errors[0].pageErrors) {
                    errMsg = errors[0].pageErrors[0].message;
                }
                
                var toastEvent = $A.get("e.force:showToast");
                toastEvent.setParams({
                    "title": "Error!",
                    "type" : "error",
                    "mode" : "sticky",
                    "message": "Server Error:" + errMsg
                });
                toastEvent.fire();                    
            }        
            
            //Save items in the backend
            helper.saveItems(component, items, onSaveSuccess, onSaveError);
        }else{
            var toastEvent = $A.get("e.force:showToast");
            toastEvent.setParams({
                "title": "Error!",
                "type" : "error",
                "mode" : "sticky",
                "message": "Save failed. Check your data and try again"
            });
            toastEvent.fire();
        }
    },
    createItem : function(component, event, helper){
        var createAction = component.get("c.createRelatedObject");
        
        createAction.setParams({          
            "objectId": component.get("v.recordId"),
            "objectName" : component.get("v.relatedObjectName"),                                       
            "jsonData": component.get("v.defaultValues")
        });
        
        createAction.setCallback(this, function(res) {            
            if (res.getState() === "SUCCESS" && res.getReturnValue()) {                        
                helper.notifyItemCreated(component, res.getReturnValue());                     
            } 
            else if (res.getState() === "ERROR") {
                $A.log("Errors", res.getError());
            }           
        });  
        
        $A.enqueueAction(createAction);         
    },
    reloadItems : function(component, event, helper){
        helper.loadItems(component); 
    },        
    deleteCallback: function(component, event, helper) {
        if (event.getParam('confirmResult')){
            var deleteDialog = component.find("deleteDialog");                
            var loaderDialog = component.find("loaderDialog");  
            
            var deleteAction = component.get("c.deleteRelatedRecord");
            var item = deleteDialog.get("v.context");
            
            deleteAction.setParams({
                "objectId": item.Id            
            });
            
            deleteAction.setCallback(this, function(res) { 
                loaderDialog.set('v.showDialog', false);                        
                
                if (res.getState() === "SUCCESS") {        
                    helper.notifyItemDeleted(component, item);
                } 
                
                else if (res.getState() === "ERROR") {
                    $A.log("Errors", res.getError());
                }                                   
            });   
            
            loaderDialog.set('v.title', 'Deleting ' + item.Name);
            loaderDialog.set("v.content", "Please wait while deleting the record");
            loaderDialog.set('v.showDialog', true);
            
            $A.enqueueAction(deleteAction);            
        }                
    },
    actionDelete : function(component, event, helper){       
        var deleteDialog = component.find("deleteDialog"); 
        var item = event.getParam('item');
        
        deleteDialog.set('v.title', 'Delete ' + item.Name);
        deleteDialog.set('v.content', 'Do you really want to delete this record?')                       
        deleteDialog.set('v.context', item);
        
        deleteDialog.set('v.showDialog', true);        
    },
    calculateColWidth: function(component, event, helper) {        
        var childObj = event.target
        var mouseStart=event.clientX;
        
        component.set("v.curElement", childObj);
        component.set("v.mouseStart", mouseStart);
        
        // Stop text selection event so mouse move event works perfectlly.
        if(event.stopPropagation) event.stopPropagation();
        if(event.preventDefault) event.preventDefault();
        event.cancelBubble=true;
        event.returnValue=false;
    },    
    setNewColWidth: function(component, event, helper) {
        var curElement = component.get("v.curElement");
        if( curElement != null && curElement.tagName ) {
            var parObj = curElement;
            
            while(parObj.parentNode.tagName != 'TH') {
                if( parObj.className == 'slds-resizable__handle')
                    curElement = parObj;    
                parObj = parObj.parentNode;               
            }
                                    
            var mouseStart = component.get("v.mouseStart");
            var oldWidth = parObj.offsetWidth;
            var newWidth = oldWidth + (event.clientX - parseFloat(mouseStart));            
            
            component.set("v.newColWidth", newWidth);
            curElement.style.right = (oldWidth - newWidth) +'px';
            component.set("v.curElement", curElement);
        }
    },
    resetColWidth: function(component, event, helper) {
        if( component.get("v.curElement") !== null ) {
            var newColWidth = component.get("v.newColWidth"); 
            var curElement = component.get("v.curElement");
                        
            var divElement = curElement.parentNode.parentNode; // Get the DIV
            var parObj = divElement.parentNode; // Get the TH Element           
                              
            divElement.style.width = newColWidth+'px';
            parObj.style.width = newColWidth+'px';
            
            curElement.style.right = 0;             
            component.set("v.curElement", null);
        }
    },
    handleSort: function(component, event, helper) {
        var selectedCol = event.currentTarget.name;        
        var currentCol = component.get("v.sort");
        var currentOrd = component.get("v.order");
        
        //If we sort the same column
        //=>toggle the order
        if(currentCol === selectedCol){
            component.set("v.order", (currentOrd=="desc")?"asc":"desc");        
        }
        else{
            component.set("v.sort", selectedCol);
            component.set("v.order", "desc");
        }
        //Load the items again from the back
        helper.loadItems(component);
    }
})