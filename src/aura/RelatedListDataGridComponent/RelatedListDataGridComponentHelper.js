({
    applyShadowEffect : function(component, event) {
        //Apply the shadow effect on the grid
        var gridContainer = component.find("gridContainer");
        $A.util.toggleClass(gridContainer, "shadow-effect");
    },
    toogleEditButton : function(component, event){
        //Show/hide the edit button
        var editButton = component.find("editButton");
        $A.util.toggleClass(editButton, "hidden");
    },   
    toogleGridActions : function(component, event){
        //Show/hide the action bar on the bottom
        var gridActions = component.find("gridActions");
        $A.util.toggleClass(gridActions, "hidden");
        
        //Show hide the view all link
        var viewAllLink = component.find("viewAllLink");
        $A.util.toggleClass(viewAllLink, "hidden");
    },
    refreshUIElements : function(component, event){
        //Apply the shadow on the grid
        this.applyShadowEffect(component, event);
        
        //Toogle the edit button
        this.toogleEditButton(component, event);
        
        //Toogle the grid actions
        this.toogleGridActions(component, event);
        
        //Toogle the total row
        this.toogleTotal(component, event);
    },
    loadItems : function(component, onSuccess, onError){
        component.set("v.isWorking", true);
        
        //Load items from Salesforce
        var dataAction = component.get("c.getReleatedItems");
        var relatedFields = component.get("v.columns")
        .filter(col => {return col.fieldApiName != null})
        .map(col => {return col.fieldApiName});
        
        dataAction.setParams({
            "objectId": component.get("v.recordId"),
            "relatedObjName": component.get("v.relatedObjectName"),
            "refFieldName": component.get("v.refFieldName"),
            "relatedFields": relatedFields,
            "filterBy": component.get("v.filter"),
            "sortBy": component.get("v.sort"),
            "orderBy": component.get("v.order")
        });	
        
        dataAction.setCallback(this, function(res) {                                    
            if (res.getState() === "SUCCESS") {                 
                var items = res.getReturnValue();   
                
                //Clean the items list
                this.cleanItems(component, items);
                
                //Call the success callback
                if(onSuccess != null){
                    onSuccess(items);
                }
            }
            else if (res.getState() === "ERROR") {
                $A.log("Errors", res.getError());
                //Call the error callback
                if(onError != null){
                    onError(res);
                }
            }
            
            component.set("v.isWorking", false);
        });   
        
        $A.enqueueAction(dataAction);    
    },
    refreshItems : function(component, items, displayMode){
        //Set the display mode
        component.set("v.displayMode", displayMode); 
        
        //Refresh the items        
        component.set("v.items", JSON.parse(JSON.stringify(items)));                
    },
    getCellComponents : function(component){
        var cellComponents = [];
        var rows = component.find("row");        
        
        if(rows){
            //Only 1 row
            if(!Array.isArray(rows)){
                rows = [rows]
            }
            
            rows.forEach(function(row){
                row.get("v.body").forEach(function(cell){
                    cellComponents.push(cell);
                })
            });
        }
        
        return cellComponents;
    },
    checkItems : function(component){
        var cellComponents = this.getCellComponents(component);        
        for(var c=0; c < cellComponents.length; c++){
            var cellCmp = cellComponents[c];
            if (cellCmp.get("v.hasErrors")){
                return false;
            }
        }                
        
        return true;
    },
    updateItems : function(component){        
        var items = component.get("v.items");
        var cellComponents = this.getCellComponents(component);
        
        //Update the items from cells
        cellComponents.forEach(function(cellCmp){
            var itemId = cellCmp.get("v.item").Id;                        
            var item = items.filter(function(elt){
                return elt.Id == itemId;
            }).pop();
            
            var column = cellCmp.get("v.column");
            
            item[column.name] = cellCmp.get("v.value");              
            if(column.type=='Reference'){
                item[column.name + '__Name'] = cellCmp.get("v.refLabel");
            }            
        });
        
        return items;
    },
    saveItems : function(component, items, onSuccess, onError){
        component.set("v.isWorking", true);
        
        //Save items on Salesforce
        var saveItemsAction = component.get("c.saveRelatedListItems");
        
        saveItemsAction.setParams({
            "jsonData": JSON.stringify(component.get("v.items"))
        });	
        
        saveItemsAction.setCallback(this, function(res) { 
            if(res.getState()=="SUCCESS"){
                onSuccess(res);				                
            }
            else{
                onError(res);                  
            }
            
            component.set("v.isWorking", false);
        });   
        
        $A.enqueueAction(saveItemsAction);
    },
    toogleTotal : function(component, event){
        //Show/hide the total row on the bottom
        if (component.get("v.aggregate")!=null){
            var totalComponent = component.find("total");
            $A.util.toggleClass(totalComponent, "hidden");
        }
    },
    cleanItems : function(component, items, noSort){
        var aggregate_map = { 
            sum : function(a, b){return a + b;},
            max : function(a, b){return Math.max(a,b);},
            min : function(a, b){return Math.min(a,b);}
        };
        
        var columns = component.get("v.columns");
        var aggregations = Array(columns.length).fill("");     	
        
        if(items && items.length > 0){
            //Apply Aggregate
            var json_aggregate = component.get("v.aggregate");                
            
            if (json_aggregate != null){    		
                var obj_aggregate = JSON.parse(json_aggregate); 
                columns.forEach(function(column, index){
                    if(obj_aggregate.hasOwnProperty(column.name)){
                        var key_aggregate = obj_aggregate[column.name];
                        var fn_aggregate = aggregate_map[key_aggregate];
                        var values = items.map(function(elt){return elt[column.name] || 0});
                        
                        if(values.length > 0){
                            var column_type = column.calculatedType || column.type;
                            var aggregated_value = values.reduce(fn_aggregate).toString();     
                            if(column_type=='Percent'){ 
                                aggregated_value = $A.localizationService.formatPercent(aggregated_value)
                            }
                            if(column_type=='Currency'){ 
                                aggregated_value = $A.localizationService.formatCurrency(aggregated_value);
                            }
                            if(column_type=='Double' || column_type=='Integer'){ 
                                aggregated_value = $A.localizationService.formatNumber(aggregated_value);
                            }
                            
                            aggregations[index] = aggregated_value;
                        }                            
                    }    
                });
            }
            
            aggregations[0] = "Total";                        
        }
        else{
            items = [];
        }
        
        //Update the UI     
        component.set("v.items", items);                   
        component.set("v.aggregations", aggregations); 
    },
    notifyItemDeleted : function(component, item){        
        var newItems = component.get("v.items");
        newItems = newItems.filter(function(elt){
            return item.Id !=  elt.Id;
        });
        
        this.cleanItems(component, newItems);
    },
    notifyItemCreated : function(component, recordId){
        component.set("v.isWorking", true);
        
        var dataAction = component.get("c.getReleatedItems");
        var relatedFields = component.get("v.columns")
        .filter(col => {return col.fieldApiName != null})
        .map(col => {return col.fieldApiName});
        
        var recordFilter = JSON.stringify({Id : recordId});
        
        dataAction.setParams({
            "objectId": component.get("v.recordId"),
            "relatedObjName": component.get("v.relatedObjectName"),
            "refFieldName": component.get("v.refFieldName"),
            "relatedFields": relatedFields,
            "filterBy": recordFilter,
            "sortBy": null,
            "orderBy": null
        });	               
        
        
        dataAction.setCallback(this, function(res) {                                    
            if (res.getState() === "SUCCESS") {                 
                var newItems = component.get("v.items");
                newItems.push(res.getReturnValue()[0]);
                
                //Clean the items list
                this.cleanItems(component, newItems, true);                
            }
            else if (res.getState() === "ERROR") {
                $A.log("Errors", res.getError());
            }
            
            component.set("v.isWorking", false);
        });   
        
        $A.enqueueAction(dataAction);    		        
    },
    viewAllUrl : function(itemId, relatedList) {
        if(window.location.href.indexOf('one.app') == -1){
            return "/lightning/r/" + itemId + "/related/" + relatedList + "/view";
        }
        else{
            return "/one/one.app#/sObject/" + itemId + "/rlName/" + relatedList + "/view";;
        }
    }     
 })