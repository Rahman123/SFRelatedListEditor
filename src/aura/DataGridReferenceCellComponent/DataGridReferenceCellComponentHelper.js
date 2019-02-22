({
    doCustomInit : function(component, event){
        var item = component.get("v.item");
        var column = component.get("v.column");
        
        if(item[column.name]){
            component.set("v.refValue", this.sobjectViewUrl(item[column.name]));
            component.set("v.refLabel", item[column.name + '__Name']);                                      
            component.set("v.objectId", item.Id);             
        }
        else{
            component.set("v.isSearching", true);                                
        }
        
        component.set("v.refFieldName", column.name);
        component.set("v.refObjName", column.refObjName);
        
        //Set filteredLookupInfo based on the configuration
        if(column['filteredLookupInfo']){
            component.set("v.filteredLookupInfo", column['filteredLookupInfo'].join(','));        
        }
    },
    searchByName : function (component, event) {
        //Clear search result info
        component.set('v.searchResults',[]);
        component.set('v.hasResults',false);
        component.set('v.isSelecting', false);
        
        //Call the controller action
        var action = component.get("c.getLookupSuggestions");
        action.setParams({
            objectId : component.get('v.objectId'),
            refObjName : component.get('v.refObjName'),
            refFieldName :  component.get('v.refFieldName'),
            lookupFilters :  component.get('v.filteredLookupInfo'),            
            searchTerm: component.get('v.searchTerm')
        });
        
        action.setCallback(this, function(response) {       
            if (response.getState() === "SUCCESS") {
                component.set('v.hasResults',true);
                component.set('v.searchResults',response.getReturnValue());                	                             
            }
        });
        
        $A.enqueueAction(action);
    },    
    setResultsInfo : function (component, event) {        
        //Clear results 
        component.set('v.hasResults',false);
        component.set('v.isSelecting', false);
        
        //Update the component from the selected candidate
        component.set('v.searchTerm', null);    
        component.set("v.isSearching", false);
        
        component.set('v.refLabel', event.currentTarget.title);    
        component.set('v.value',event.currentTarget.id);         
        
        //Update Errors 
        component.set("v.hasErrors", false);
        component.set("v.errors", []);         
    },
    resetAfterBlur : function(component, event){
        if(!component.get('v.isSelecting')){
            //Reset search properties
            component.set('v.searchTerm',null);    
            component.set('v.hasResults',false);    
            
            //Check required flag
            if(component.get("v.required")){
                component.set("v.hasErrors", true);
                component.set("v.errors", [{
                    message:"This field is required"
                }]);         
            }  
        }  
    },
    resetBeforeSearch : function(component, event){
        //Reset lookup properties
        component.set('v.value', null); 
        component.set('v.refLabel', null);       
        component.set('v.isSearching', true); 
        
        //Check required flag
        if(component.get("v.required")){
            component.set("v.hasErrors", true);
            component.set("v.errors", [{
                message:"This field is required"
            }]);         
        } 
    }		
})