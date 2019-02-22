public with sharing class RestAPIUtils {
    static public String SF_HOST = System.Url.getSalesforceBaseURL().toExternalForm();
    static public String QUERY_API_URL = SF_HOST + '/services/data/v44.0/tooling/query/?q=';
    static public String SOBJECT_API_URL = SF_HOST + '/services/data/v44.0/sobjects/';   
    static public String UI_API_URL = SF_HOST + '/services/data/v44.0/ui-api/';   

    
    /**
     * Helper function to call the SF Rest API
     * */
    private Static String callRestAPI(String endPoint, 
                                      String sessionId, 
                                      String method, 
                                      String body)
    {            
        HttpRequest req = new HttpRequest();
        
        req.setMethod(method);
        req.setEndpoint(endPoint);
        req.setHeader('Content-type', 'application/json');       
        req.setHeader('Authorization', 'Bearer ' + sessionId);
        Http http = new Http();
        
        HTTPResponse res = http.send(req);        
        return res.getBody();
    }
    
    /**
     * Helper function to get a session Id 
     * For Rest API calls
     * */
    public static String getSessionId()
    {        
        if (Test.IsRunningTest())
        {
            return UserInfo.getSessionId();
        }else{
            PageReference newPage = Page.GetSessionIdPage;
            String content = newPage.getContent().toString();
            return content.substringBetween('<SessionId>', '</SessionId>');
        }        
    }
    
    /**
     * Helper function to call the SF Query API
     * */
    public Static String callQueryAPI(String query, 
                                       String sessionId)
    {    
        return callRestAPI(QUERY_API_URL + query, 
                           sessionId,
                           'GET', null);        
    }
    
    public Static String callQueryAPI(String query)
    {    
        return callQueryAPI(query, 
                            getSessionId());        
    }
    
    /**
     * Helper function to call the SF Sobject API
     * */
    public Static String callSObjectAPI(String query)
    {  
        return callRestAPI(SOBJECT_API_URL + query, 
                           getSessionId(),
                           'GET', null);        
    }
    
    /**
     * Helper function to call the SF Url API
     * */
    public Static String callUrlAPI(String url){        
        return callRestAPI(SF_HOST + url, 
                           getSessionId(),
                           'GET', null); 
    }
    
    /**
     * Helper function to call the SF UI API
     * */
    public Static String callUiAPI(String query)
    {  
        return callRestAPI(UI_API_URL + query, 
                           getSessionId(),
                           'GET', null);        
    }
    
    /**
     * Return the related lists metadata 
     * For a given object Id and a record type name
     * */
    public static Object[] getRelatedListsMetadata(Id objectId, 
                                                   String reccordType)
    {   
        String objectName = objectId.getSobjectType().getDescribe().getName();
        String jsonDescribe = callSObjectAPI(objectName + '/describe');             
        Map<String, Object> objMetadata = (Map<String, Object>)JSON.deserializeUntyped(jsonDescribe);
        
        for(Object recordInfo : (Object[])objMetadata.get('recordTypeInfos')){            
            Map<String, Object> recordInfoMap = (Map<String, Object>)recordInfo;
            
            if(reccordType == null || reccordType == recordInfoMap.get('name')){ 
                Map<String, Object> urlMap = (Map<String, Object>)recordInfoMap.get('urls');
                if(urlMap.containsKey('layout')){
                    String jsonLayout = callUrlAPI((String)urlMap.get('layout'));
                    Map<String, Object> layoutMetadata = (Map<String, Object>)JSON.deserializeUntyped(jsonLayout);
                    Object[] relatedLists = (Object[])layoutMetadata.get('relatedLists');                    
                    return relatedLists;
                }
            }                        
        }
       
        return null;
    }
    
      
    /**
     * Return the related list items
     * For a given object Id and a related list name
     * */
    public static Object[] getRelatedListItems(Id objectId, 
                                               String relatedlistName)
    {                
        String objectName = objectId.getSobjectType().getDescribe().getName();
        
        String jsonRelatedItems = callSObjectAPI(objectName + '/' +                                                 
                                                 objectId + '/' +
                                                 relatedlistName);
        try{            
            Map<String, Object> queryResult = (Map<String, Object>)JSON.deserializeUntyped(jsonRelatedItems);         
        	return (Object[])queryResult.get('records');
        }
        catch(Exception e){
            System.debug('ERROR:' + e);
            return new List<Object>();
        }
    } 
    
    /**
     * Return the object data
     * For a given object Id
     * */
    public static Map<String, Object> getObject(Id objectId)
    {
        String objectName = objectId.getSobjectType().getDescribe().getName();        
        String jsonData = callSObjectAPI(objectName + '/' +                                                 
                                         objectId );
        
        return (Map<String, Object>)JSON.deserializeUntyped(jsonData);                 
    }
    
    /**
     * Return the record type name
     * For a given object Id
     * */
    public static String getObjectRecordTypeName(Id objectId)
    {
        Map<String, Object> mObject = getObject(objectId);
        if (mObject.containsKey('RecordTypeId') && 
            mObject.get('RecordTypeId') != null){
            Map<Id,Schema.RecordTypeInfo> recordTypeInfo = 
                objectId.getSobjectType().getDescribe().getRecordTypeInfosById();            
            return recordTypeInfo.get((Id)mObject.get('RecordTypeId')).getName();            
        }
        
        return 'Master';
    } 
    
    /**
     * Return the lookup filters information 
     * For a given object name
     * */
    public static Map<String, Object> getLookupFiltersMetadata(String objectName)
    {   
        String jsonObjInfo = callUiAPI('object-info/' + objectName);             
        Map<String, Object> objMetadata = (Map<String, Object>)JSON.deserializeUntyped(jsonObjInfo);
        Map<String, Object> fieldsMetadata = (Map<String, Object>)objMetadata.get('fields');
        Map<String, Object> result = new Map<String, Object>();
        
        //Iterate over the fields and process only references
        for(String fieldName : fieldsMetadata.keySet()){            
            Map<String, Object> fieldInfo = (Map<String, Object>)fieldsMetadata.get(fieldName);
            
            if(fieldInfo.get('dataType') == 'Reference' && fieldInfo.get('filteredLookupInfo') != null){ 
                result.put(fieldName, ((Map<String, Object>)fieldInfo.get('filteredLookupInfo')).get('controllingFields')); 
            }                        
        }
       
        return result;
    }
    
    /**
     * Return the lookup field Suggestions  
     * For a given lookup field
     * */
    public static Object[] getLookupFieldSuggestions(String objName,
                                                     String refObjName, 
                                                     String refFieldName, 
                                                     String dependentFieldBindings, 
                                                     String searchTerm)
    {   
        List<Object> records = new List<Object>();
        String query = 'lookups/' + objName + '/' + refFieldName;
        query += '?searchType=TypeAhead&q=' + searchTerm;

        if(!String.isBlank(dependentFieldBindings)){
            query += '&dependentFieldBindings=' + dependentFieldBindings;
        }
                 
        Map<String, Object> lookupResults = (Map<String, Object>)JSON.deserializeUntyped(callUiAPI(query));
        System.debug(lookupResults);
        if(lookupResults != null && lookupResults.get('lookupResults') != null){
            lookupResults = (Map<String, Object>)lookupResults.get('lookupResults');            
            if(lookupResults != null && lookupResults.get(refObjName) != null){
                Map<String, Object> objectMap = (Map<String, Object>)lookupResults.get(refObjName);
                for(Object record : (Object[])objectMap.get('records')){
                    Map<String, Object> recordMap = (Map<String, Object>)record;
                    recordMap = (Map<String, Object>)recordMap.get('fields');
                    
                    Map<String, Object> simpleRecord = new Map<String, Object>();
                    for(String fieldName : recordMap.keySet()){
                        Map<String, Object> fieldMap = (Map<String, Object>)recordMap.get(fieldName);                        
                        simpleRecord.put(fieldName, fieldMap.get('value'));
                    }
                    records.add(simpleRecord);
                }
                
                return records;
            }
        }
        
        return null;
    }
}